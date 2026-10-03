# Ported from crm/domain_enrichment/config.py (frappe/crm, AGPL-3.0)
"""Loads enrichment configuration (Settings + Rules + Field Mappings).

The engine is rule-agnostic: it loads admin-edited config here and executes it.
``get_config()`` assembles an ``EnrichmentConfig`` from the config doctypes on
demand (not cached -- see the note on ``get_config``).
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

ENRICHABLE_DOCTYPES = ("CRM Lead", "CRM Deal", "CRM Organization")

DEFAULT_SETTINGS = {
    "enabled": 1,
    "auto_enrich": 0,
    "max_pages": 10,
    "max_depth": 2,
    "use_sitemap": 1,
    "request_timeout": 10,
    "max_download_bytes": 3_000_000,
    "retry_count": 2,
    "user_agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    ),
}


def _setting(settings_obj, key):
    val = getattr(settings_obj, key, None)
    return DEFAULT_SETTINGS.get(key) if val in (None, "") else val


def get_settings():
    from apps.crm.doctype.enrichment_settings.enrichment_settings import CRMEnrichmentSettings

    return CRMEnrichmentSettings.get_solo()


def auto_enrich_enabled_for(doctype: str) -> bool:
    s = get_settings()
    return bool(_setting(s, "enabled") and _setting(s, "auto_enrich") and doctype in ENRICHABLE_DOCTYPES)


INDUSTRY_MIN_SCORE = 2
INDUSTRY_MIN_CONFIDENCE = 0.34

DEFAULT_LINK_PRIORITY = [
    ("about", 1.0), ("contact", 1.0), ("team", 1.0), ("leadership", 1.0), ("careers", 1.0),
    ("company", 1.0), ("people", 1.0), ("founders", 1.0), ("management", 1.0), ("jobs", 1.0),
]


@dataclass
class Rule:
    rule_type: str
    target_value: str = ""
    industry: str = ""
    weight: float = 1.0
    match_scope: str = "Full Text"
    patterns: list = field(default_factory=list)

    @property
    def label(self) -> str:
        return self.industry if self.rule_type == "Industry" else self.target_value

    def matches(self, text: str) -> int:
        if not text:
            return 0
        return sum(len(rx.findall(text)) for rx, _raw in self.patterns)


@dataclass
class Mapping:
    source_key: str
    target_doctype: str
    target_fieldname: str
    write_policy: str = "Fill if empty"
    create_missing_link: int = 0
    default_values: str = ""


@dataclass
class EnrichmentConfig:
    settings: dict = field(default_factory=dict)
    rules_by_type: dict = field(default_factory=dict)
    mappings_by_doctype: dict = field(default_factory=dict)
    link_priority: list = field(default_factory=list)
    skip_patterns: list = field(default_factory=list)
    allowed_domains: list = field(default_factory=list)
    blocked_domains: list = field(default_factory=list)

    def setting(self, key, default=None):
        val = self.settings.get(key)
        if val in (None, ""):
            return DEFAULT_SETTINGS.get(key, default)
        return val

    def rules(self, rule_type: str) -> list:
        return self.rules_by_type.get(rule_type, [])


def _compile_pattern(pattern: str, is_regex):
    try:
        if is_regex:
            return re.compile(pattern, re.IGNORECASE)
        return re.compile(rf"\b{re.escape(pattern)}\b", re.IGNORECASE)
    except re.error:
        logger.warning("Domain Enrichment: could not compile pattern: %r", pattern)
        return None


def _build_rules() -> dict:
    from apps.crm.doctype.enrichment_rule.enrichment_rule import CRMEnrichmentRule

    rules_by_type: dict = {}
    for doc in CRMEnrichmentRule.objects.filter(enabled=True).prefetch_related("patterns"):
        compiled = []
        for pat in doc.patterns.all():
            rx = _compile_pattern(pat.pattern, pat.is_regex)
            if rx is not None:
                compiled.append((rx, pat.pattern))
        if not compiled:
            continue
        rule = Rule(
            rule_type=doc.rule_type,
            target_value=doc.target_value or "",
            industry=doc.industry_id or "",
            weight=doc.weight or 1.0,
            match_scope=doc.match_scope or "Full Text",
            patterns=compiled,
        )
        rules_by_type.setdefault(doc.rule_type, []).append(rule)
    return rules_by_type


def _build_mappings() -> dict:
    from apps.crm.doctype.enrichment_field_mapping.enrichment_field_mapping import CRMEnrichmentFieldMapping

    mappings_by_doctype: dict = {}
    for row in CRMEnrichmentFieldMapping.objects.filter(enabled=True):
        mapping = Mapping(
            source_key=row.source_key,
            target_doctype=row.target_doctype,
            target_fieldname=row.target_fieldname,
            write_policy=row.write_policy or "Fill if empty",
            create_missing_link=row.create_missing_link or 0,
            default_values=row.default_values or "",
        )
        mappings_by_doctype.setdefault(row.target_doctype, []).append(mapping)
    return mappings_by_doctype


def _build_settings(settings_obj) -> dict:
    return {key: getattr(settings_obj, key, None) for key in DEFAULT_SETTINGS}


def _build_config() -> EnrichmentConfig:
    settings_obj = get_settings()

    link_priority = [
        (kw.keyword.lower(), kw.weight or 1.0)
        for kw in settings_obj.link_priority_order.all()
        if kw.keyword
    ] or list(DEFAULT_LINK_PRIORITY)

    skip_patterns = [sp.pattern for sp in settings_obj.skip_patterns.all() if sp.pattern]

    allowed_domains = [d.domain.lower().strip() for d in settings_obj.allowed_domains_list if d.domain]
    blocked_domains = [d.domain.lower().strip() for d in settings_obj.blocked_domains_list if d.domain]

    return EnrichmentConfig(
        settings=_build_settings(settings_obj),
        rules_by_type=_build_rules(),
        mappings_by_doctype=_build_mappings(),
        link_priority=link_priority,
        skip_patterns=skip_patterns,
        allowed_domains=allowed_domains,
        blocked_domains=blocked_domains,
    )


def get_config() -> EnrichmentConfig:
    """Assemble the full enrichment config fresh -- deliberately not cached,
    see the original's note: a run is a multi-second network-bound crawl, so
    the handful of small queries here is noise."""
    return _build_config()
