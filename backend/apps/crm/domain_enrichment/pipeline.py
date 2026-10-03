# Ported verbatim from crm/domain_enrichment/pipeline.py (frappe/crm, AGPL-3.0)
"""Orchestration: load config, crawl, run extractors, assemble an EnrichmentResult.

``run()`` never writes to the DB or CRM docs (that is tasks.py's job) and never
raises for fetch/source failures -- they are captured as errors/notes on the result.
"""

from __future__ import annotations

from urllib.parse import urlparse

from . import extractors
from .config import EnrichmentConfig, get_config
from .crawler import crawl, probe_about_pages
from .http import build_session
from .result import EnrichmentResult, Field, Method

PROGRESS_STEPS = [
    "Discovering pages",
    "Crawling website",
    "Extracting company information",
    "Extracting contacts",
    "Classifying industry",
    "Saving results",
    "Completed",
]


def _normalize_website(url: str) -> str:
    url = (url or "").strip()
    if not url:
        raise ValueError("website URL is required")
    if not urlparse(url).scheme:
        url = "https://" + url
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"unsupported URL scheme: {parsed.scheme}")
    if not parsed.netloc:
        raise ValueError(f"invalid URL: {url}")
    return url


def run(website: str, cfg: EnrichmentConfig = None, progress=None) -> EnrichmentResult:
    website = _normalize_website(website)
    cfg = cfg or get_config()
    result = EnrichmentResult(website=website)

    def emit(step_index, message=""):
        if progress:
            try:
                progress(step_index, message or PROGRESS_STEPS[step_index])
            except Exception:
                pass

    session = build_session(cfg)
    try:
        emit(0)
        crawled = crawl(website, cfg, session=session, progress=lambda msg: emit(1, msg))
        pages = [page for page, _soup in crawled]
        soups_by_url = {page.url: soup for page, soup in crawled}
        result.pages_crawled = [{"url": p.url, "status": p.status_code, "error": p.error} for p in pages]
        result.errors = [{"url": p.url, "error": p.error} for p in pages if p.error]

        reason = extractors.diagnose_readability(pages)
        if reason in ("blocked", "unreachable"):
            result.notes.append(extractors.READABILITY_MESSAGES[reason])
            emit(6)
            return result
        if reason == "empty":
            result.notes.append(extractors.READABILITY_MESSAGES["empty"])

        homepage = pages[0]
        home_soup = soups_by_url.get(homepage.url)

        max_pages = int(cfg.setting("max_pages", 10) or 10)
        if home_soup and len(pages) < max_pages and not any(extractors._is_about_page(p.url) for p in pages):
            for page, soup in probe_about_pages(
                homepage.url, cfg, session=session, skip_urls=[p.url for p in pages]
            ):
                pages.append(page)
                soups_by_url[page.url] = soup
                result.pages_crawled.append({"url": page.url, "status": page.status_code, "error": page.error})

        emit(2)
        company = extractors.extract_company_info(homepage, home_soup) if home_soup else {}
        result.company_name = company.get("company_name") or Field()
        result.logo = company.get("logo") or Field()
        result.image = company.get("image") or Field()
        result.description = (
            extractors.select_description(
                pages, soups_by_url,
                industry_rules=cfg.rules("Industry"), company_name=result.company_name.value,
            )
            or company.get("description")
            or Field()
        )

        emit(3)
        result.emails = extractors.extract_emails(pages)
        result.phones = extractors.extract_phones(pages)
        result.social_profiles = extractors.extract_social_profiles(
            pages, soups_by_url, cfg.rules("Social"), extra_links=company.get("social_links"),
        )

        emit(4)
        industry, confidence = extractors.classify_industry(pages, company, cfg.rules("Industry"))
        result.industry = Field(industry, website, Method.KEYWORD_CLASSIFIER) if industry else Field()
        result.industry_confidence = confidence

        emit(5)
        emit(6)
        return result
    finally:
        session.close()
