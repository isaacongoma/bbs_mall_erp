import hashlib
import re
from datetime import UTC, datetime

import frappe

DEFAULT_PULSE_HOST = "https://pulse.m.frappe.cloud"


def pulse_host() -> str:
    return ensure_http(frappe.conf.get("pulse_host") or DEFAULT_PULSE_HOST).rstrip("/")


def anonymize_user(user):
    """
    Create consistent anonymous ID from user email.
    Same email always produces same anonymous ID.
    """
    if not user or user in frappe.STANDARD_USERS:
        return user

    pattern = r"^user_[a-f0-9]{12}$"
    if re.match(pattern, user):
        return user

    site_salt = frappe.local.site or "default"

    hash_input = f"{user}:{site_salt}".encode()
    user_hash = hashlib.sha256(hash_input).hexdigest()

    return f"user_{user_hash[:12]}"


def parse_interval(interval):
    """
    Parse interval string or integer into seconds.

    Args:
        interval: Can be:
            - Integer: seconds (e.g., 3600)
            - String: number + unit (e.g., "1h", "30m", "7d")

    Returns:
        int: Total seconds

    Examples:
        parse_interval(3600) -> 3600
        parse_interval("1h") -> 3600
        parse_interval("30m") -> 1800
        parse_interval("7d") -> 604800
    """
    if interval is None:
        return None

    if isinstance(interval, int):
        return interval

    interval = str(interval).strip().lower()

    if interval[-1].isdigit():
        return int(interval)

    unit = interval[-1]
    try:
        number = int(interval[:-1])
    except ValueError:
        raise ValueError(f"Invalid interval format: {interval}")

    multipliers = {
        "s": 1,
        "m": 60,
        "h": 3600,
        "d": 86400,
        "w": 604800,
        "y": 31536000,
    }

    if unit not in multipliers:
        raise ValueError(f"Invalid time unit '{unit}'. Use: s, m, h, d, w, y")

    return number * multipliers[unit]


def utc_iso() -> str:
    return datetime.now(UTC).isoformat()


def ensure_http(url: str) -> str:
    return url if url.startswith(("http://", "https://")) else "https://" + url
