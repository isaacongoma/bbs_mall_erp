# Ported from crm/domain_enrichment/http.py (frappe/crm, AGPL-3.0)
# The only change from the original: frappe.utils.get_request_session() (a thin
# wrapper that builds a requests.Session with a default retry adapter) is replaced
# with a plain requests.Session() -- the SSRF guard, IP-pinning and byte-cap logic
# below are unchanged.
"""HTTP fetch layer for the crawler, with an SSRF guard.

Adds the crawler-specific behavior a bare requests session does not provide:

* a hard download cap (``max_download_bytes``) via streamed reads,
* an HTML-only content-type filter,
* the never-raise ``(status_code, html, error, final_url)`` contract, and
* a mandatory SSRF guard that resolves the hostname and rejects loopback/
  private/link-local/reserved addresses, honors the Settings allow/block lists,
  and re-validates the resolved IP after every redirect. Every connection is
  pinned to the IP the guard validated (Host header and TLS SNI/verification
  stay on the original hostname), so a DNS-rebinding host cannot pass
  validation with one address and connect to another.
"""

from __future__ import annotations

import ipaddress
import re
import socket
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter, Retry

HTML_CONTENT_TYPES = ("text/html", "application/xhtml")
RETRY_STATUS_FORCELIST = (429, 500, 502, 503, 504)
MAX_REDIRECTS = 5
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)


class SSRFError(Exception):
    """Raised internally when a URL fails the SSRF guard. Never escapes ``fetch``."""


def _domain_in_list(host: str, domains: list) -> bool:
    host = (host or "").lower().split(":")[0].rstrip(".")
    for d in domains:
        d = (d or "").lower().strip().rstrip(".")
        if not d:
            continue
        if host == d or host.endswith("." + d):
            return True
    return False


def _is_blocked_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return True
    return not addr.is_global or addr.is_multicast


def _resolve_ips(host: str) -> list:
    infos = socket.getaddrinfo(host, None)
    return list({info[4][0] for info in infos})


def validate_url(url: str, cfg) -> str:
    _validated_ips(url, cfg)
    return url


def _validated_ips(url: str, cfg) -> list:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise SSRFError(f"unsupported URL scheme: {parsed.scheme or '(none)'}")

    host = (parsed.hostname or "").strip().rstrip(".")
    if not host:
        raise SSRFError("URL has no host")

    blocked = cfg.blocked_domains if cfg else []
    allowed = cfg.allowed_domains if cfg else []
    if _domain_in_list(host, blocked):
        raise SSRFError(f"host is on the blocked-domains list: {host}")
    if allowed and not _domain_in_list(host, allowed):
        raise SSRFError(f"host is not on the allowed-domains list: {host}")

    try:
        ips = _resolve_ips(host)
    except socket.gaierror as exc:
        raise SSRFError(f"could not resolve host {host}: {exc}") from exc
    if not ips:
        raise SSRFError(f"could not resolve host {host}")
    for ip in ips:
        if _is_blocked_ip(ip):
            raise SSRFError(f"host {host} resolves to a non-public address: {ip}")

    return sorted(ips, key=lambda ip: (":" in ip, ip))


def build_session(cfg=None):
    retries = int(cfg.setting("retry_count")) if cfg else 2
    user_agent = cfg.setting("user_agent") if cfg else DEFAULT_USER_AGENT
    session = requests.Session()
    try:
        adapter = HTTPAdapter(max_retries=_retry_policy(retries))
        session.mount("http://", adapter)
        session.mount("https://", adapter)
    except Exception:  # pragma: no cover
        pass
    session.headers.update(
        {
            "User-Agent": user_agent,
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;q=0.9,"
                "image/avif,image/webp,image/apng,*/*;q=0.8"
            ),
            "Accept-Language": "en-US,en;q=0.9",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Sec-CH-UA": '"Chromium";v="125", "Not.A/Brand";v="24", "Google Chrome";v="125"',
            "Sec-CH-UA-Mobile": "?0",
            "Sec-CH-UA-Platform": '"Windows"',
        }
    )
    return session


def _retry_policy(retries: int) -> Retry:
    return Retry(
        total=retries, backoff_factor=0.3,
        status_forcelist=RETRY_STATUS_FORCELIST, allowed_methods=frozenset(["GET", "HEAD"]),
    )


class _PinnedIPAdapter(HTTPAdapter):
    def __init__(self, hostname: str, **kwargs):
        self._server_hostname = hostname
        super().__init__(**kwargs)

    def init_poolmanager(self, *args, **kwargs):
        kwargs["server_hostname"] = self._server_hostname
        super().init_poolmanager(*args, **kwargs)


def _pinned_adapter(session, hostname: str, retries: int) -> _PinnedIPAdapter:
    cache = getattr(session, "_pinned_adapters", None)
    if cache is None:
        cache = {}
        session._pinned_adapters = cache
    adapter = cache.get(hostname)
    if adapter is None:
        adapter = _PinnedIPAdapter(hostname, max_retries=_retry_policy(retries))
        cache[hostname] = adapter
    return adapter


def _pinned_get(session, url: str, pinned_ip: str, timeout: int, retries: int):
    parsed = urlparse(url)
    host = parsed.hostname or ""
    ip_netloc = f"[{pinned_ip}]" if ":" in pinned_ip else pinned_ip
    if parsed.port:
        ip_netloc = f"{ip_netloc}:{parsed.port}"
    host_header = f"{host}:{parsed.port}" if parsed.port else host

    prepared = session.prepare_request(
        requests.Request("GET", parsed._replace(netloc=ip_netloc).geturl(), headers={"Host": host_header})
    )
    return _pinned_adapter(session, host, retries).send(
        prepared, timeout=timeout, stream=True, verify=session.verify, cert=session.cert,
    )


_META_CHARSET_RE = re.compile(rb"""charset=["']?\s*([a-zA-Z0-9_\-]+)""", re.IGNORECASE)


def _sniff_html_charset(raw: bytes) -> str | None:
    match = _META_CHARSET_RE.search(raw[:4096])
    if match:
        try:
            return match.group(1).decode("ascii")
        except (UnicodeDecodeError, AttributeError):
            return None
    return None


def _read_capped(resp, max_bytes: int) -> str:
    chunks = []
    total = 0
    for chunk in resp.iter_content(chunk_size=16_384, decode_unicode=False):
        if not chunk:
            continue
        total += len(chunk)
        chunks.append(chunk)
        if total >= max_bytes:
            break
    raw = b"".join(chunks)
    if "charset=" in resp.headers.get("Content-Type", "").lower():
        encoding = resp.encoding or "utf-8"
    else:
        encoding = _sniff_html_charset(raw) or "utf-8"
    try:
        return raw.decode(encoding, errors="replace")
    except (LookupError, TypeError):
        return raw.decode("utf-8", errors="replace")


def fetch(url: str, cfg, session=None, html_only: bool = True):
    timeout = int(cfg.setting("request_timeout")) if cfg else 10
    max_bytes = int(cfg.setting("max_download_bytes")) if cfg else 3_000_000
    retries = int(cfg.setting("retry_count")) if cfg else 2

    own_session = session is None
    session = session or build_session(cfg)
    current = url
    try:
        for _hop in range(MAX_REDIRECTS + 1):
            try:
                ips = _validated_ips(current, cfg)
            except SSRFError as exc:
                return 0, "", f"blocked by SSRF guard: {exc}", current

            resp = _pinned_get(session, current, ips[0], timeout, retries)

            if resp.is_redirect or resp.is_permanent_redirect:
                location = resp.headers.get("Location")
                resp.close()
                if not location:
                    return resp.status_code, "", "redirect without Location header", current
                current = requests.compat.urljoin(current, location)
                continue

            content_type = resp.headers.get("Content-Type", "").lower()
            if html_only and content_type and not any(ct in content_type for ct in HTML_CONTENT_TYPES):
                status = resp.status_code
                resp.close()
                return status, "", f"skipped non-HTML content-type: {content_type}", current

            html = _read_capped(resp, max_bytes)
            status = resp.status_code
            resp.close()
            return status, html, "", current

        return 0, "", "too many redirects", current
    except requests.exceptions.Timeout:
        return 0, "", f"timeout after {timeout}s", current
    except requests.exceptions.TooManyRedirects:
        return 0, "", "too many redirects", current
    except requests.exceptions.SSLError as exc:
        return 0, "", f"ssl error: {exc}", current
    except requests.exceptions.ConnectionError as exc:
        return 0, "", f"connection error: {exc}", current
    except requests.exceptions.RequestException as exc:
        return 0, "", f"request error: {exc}", current
    except Exception as exc:  # pragma: no cover
        return 0, "", f"unexpected error: {exc}", current
    finally:
        if own_session:
            session.close()
