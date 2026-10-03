# Ported from crm/domain_enrichment/install.py's seed_default_rules_and_mappings
# (frappe/crm, AGPL-3.0)
import hashlib

from django.db import migrations

INDUSTRY_KEYWORDS = {
    "ERP": ["erp", "enterprise resource planning", "procurement", "supply chain management", "inventory management"],
    "CRM": ["crm", "customer relationship management", "sales pipeline", "lead management", "contact management"],
    "Ecommerce": [
        "ecommerce", "e-commerce", "online shopping", "online store", "marketplace", "shopping cart",
        "add to cart", "add to bag", "storefront", "checkout", "shop", "free shipping", "free returns",
        "new arrivals", "best sellers", "bestsellers", "size guide", "apparel", "clothing brand",
        "direct-to-consumer", "quick commerce", "q-commerce", "online grocery", "online groceries",
        "grocery delivery", "grocery app", "delivery app", "online shop",
    ],
    "SaaS": ["saas", "software as a service", "subscription software", "cloud platform", "free trial"],
    "Technology": [
        "software", "developer", "developers", "api", "open source", "cloud computing", "it services",
        "information technology", "artificial intelligence", "machine learning",
    ],
    "Semiconductors": ["semiconductor", "gpu", "graphics card", "processor", "chipset", "supercomputer", "microprocessor"],
    "Manufacturing": [
        "manufacturing", "factory", "production line", "assembly line", "fabrication", "industrial equipment",
        "3d printing", "additive manufacturing", "cnc machining", "rapid prototyping", "injection molding",
        "prototyping",
    ],
    "Healthcare": [
        "healthcare", "health care", "clinic", "hospital", "patient care", "medical", "telehealth",
        "pharmaceutical", "pharma",
    ],
    "Education": [
        "education", "e-learning", "students", "curriculum", "university", "online courses", "courses",
        "course", "edtech", "learning platform",
    ],
    "Consulting": ["consulting", "advisory services", "consultants", "professional services", "strategy consulting"],
    "Marketing": [
        "marketing agency", "digital marketing", "advertising agency", "seo services", "ad campaigns", "media buying",
    ],
    "Finance": [
        "fintech", "banking", "payments", "lending", "insurance", "financial services", "trading",
        "wealth management",
    ],
    "Logistics": ["logistics", "freight", "warehousing", "fulfillment", "shipping carrier", "last-mile delivery"],
    "Food & Beverage": [
        "food and beverage", "beverage", "beverages", "snacks", "snack", "packaged food", "fmcg",
        "consumer goods", "sparkling water", "iced tea", "energy drink", "soft drink", "drink", "drinks",
        "soda", "kombucha", "cereal", "coffee", "chocolate", "protein bar",
    ],
    "Retail": ["retailer", "department store", "brick and mortar"],
    "Media": [
        "entertainment", "streaming service", "video game", "game studio", "publishing house", "news media",
        "broadcasting", "journalism", "journalists", "media company", "newsroom", "newsletter",
        "reported articles", "investigative", "editorial", "magazine", "podcast", "reporting on",
    ],
    "Real Estate": [
        "real estate", "property management", "commercial property", "interior design", "home design",
        "home improvement", "remodeling", "decorating", "home renovation",
    ],
    "Travel": ["hospitality", "tourism", "flight booking", "travel agency"],
    "Automotive": ["automotive", "electric vehicle", "car manufacturer"],
    "Telecom": ["telecommunications", "broadband", "network operator"],
    "Energy": ["renewable energy", "solar power", "oil and gas"],
    "Legal": [
        "law firm", "legal services", "litigation", "legal help", "legal documents", "legal advice",
        "attorney", "attorneys", "lawyer", "lawyers",
    ],
    "Nonprofit": ["nonprofit", "non-profit", "ngo", "charity"],
}

SOCIAL_PATTERNS = {
    "linkedin": [r"linkedin\.com/(company|in|school)/"],
    "twitter": [r"(twitter\.com|x\.com)/[A-Za-z0-9_]+"],
    "github": [r"github\.com/[A-Za-z0-9_.-]+"],
    "facebook": [r"facebook\.com/[A-Za-z0-9_.\-/]+"],
    "instagram": [r"instagram\.com/[A-Za-z0-9_.]+"],
    "youtube": [r"youtube\.com/(channel/|c/|user/|@)[A-Za-z0-9_.\-]+"],
}

_LEAD, _DEAL, _ORG = "CRM Lead", "CRM Deal", "CRM Organization"

FIELD_MAPPINGS = [
    ("company_name", _LEAD, "organization", "Fill if empty", None, 0),
    ("company_name", _DEAL, "organization_name", "Fill if empty", None, 0),
    ("company_name", _ORG, "organization_name", "Fill if empty", None, 0),
    *[
        (k, dt, fn, "Fill if empty", None, 0)
        for dt in (_LEAD, _DEAL, _ORG)
        for k, fn in (("logo", "organization_logo"), ("description", "company_description"))
    ],
    *[("industry", dt, "industry", "Fill if empty", None, 1) for dt in (_LEAD, _DEAL, _ORG)],
    *[
        (k, dt, fn, "Fill if empty", None, 0)
        for dt in (_LEAD, _DEAL, _ORG)
        for k, fn in (("linkedin", "linkedin"), ("twitter", "twitter"), ("facebook", "facebook"))
    ],
]

DEFAULT_LINK_PRIORITY = [
    ("about", 1.0), ("contact", 1.0), ("team", 1.0), ("leadership", 1.0), ("careers", 1.0),
    ("company", 1.0), ("people", 1.0), ("founders", 1.0), ("management", 1.0), ("jobs", 1.0),
]


def seed_enrichment_defaults(apps, schema_editor):
    CRMIndustry = apps.get_model("crm", "CRMIndustry")
    CRMEnrichmentRule = apps.get_model("crm", "CRMEnrichmentRule")
    CRMEnrichmentRulePattern = apps.get_model("crm", "CRMEnrichmentRulePattern")
    CRMEnrichmentFieldMapping = apps.get_model("crm", "CRMEnrichmentFieldMapping")
    CRMEnrichmentSettings = apps.get_model("crm", "CRMEnrichmentSettings")
    CRMEnrichmentLinkPriority = apps.get_model("crm", "CRMEnrichmentLinkPriority")

    def make_rule(rule_name, rule_type, patterns, *, target_value="", industry_id=None,
                  weight=1, match_scope="Full Text", is_regex=False):
        if CRMEnrichmentRule.objects.filter(rule_name=rule_name).exists():
            return
        rule = CRMEnrichmentRule.objects.create(
            name=f"{rule_type}-{hashlib.md5(rule_name.encode()).hexdigest()[:10]}",
            rule_name=rule_name, rule_type=rule_type, target_value=target_value,
            industry_id=industry_id, weight=weight, match_scope=match_scope, enabled=True,
        )
        for idx, pattern in enumerate(patterns, start=1):
            CRMEnrichmentRulePattern.objects.create(
                parent=rule, idx=idx, pattern=pattern, is_regex=is_regex
            )

    for industry, keywords in INDUSTRY_KEYWORDS.items():
        CRMIndustry.objects.get_or_create(name=industry)
        make_rule(f"Industry: {industry}", "Industry", keywords, industry_id=industry, match_scope="Headline")

    for network, patterns in SOCIAL_PATTERNS.items():
        make_rule(f"Social: {network}", "Social", patterns, target_value=network, match_scope="HTML", is_regex=True)

    for source_key, target_doctype, target_fieldname, write_policy, default_values, create_link in FIELD_MAPPINGS:
        exists = CRMEnrichmentFieldMapping.objects.filter(
            source_key=source_key, target_doctype=target_doctype, target_fieldname=target_fieldname
        ).exists()
        if exists:
            continue
        CRMEnrichmentFieldMapping.objects.create(
            enabled=True, source_key=source_key, target_doctype=target_doctype,
            target_fieldname=target_fieldname, write_policy=write_policy,
            default_values=default_values or "", create_missing_link=create_link,
        )

    settings_obj, _created = CRMEnrichmentSettings.objects.get_or_create(id=1)
    if not settings_obj.link_priority_order.exists():
        for idx, (keyword, weight) in enumerate(DEFAULT_LINK_PRIORITY, start=1):
            CRMEnrichmentLinkPriority.objects.create(parent=settings_obj, idx=idx, keyword=keyword, weight=weight)


def unseed_enrichment_defaults(apps, schema_editor):
    CRMEnrichmentRule = apps.get_model("crm", "CRMEnrichmentRule")
    names = [f"Industry: {k}" for k in INDUSTRY_KEYWORDS] + [f"Social: {k}" for k in SOCIAL_PATTERNS]
    CRMEnrichmentRule.objects.filter(rule_name__in=names).delete()

    CRMEnrichmentFieldMapping = apps.get_model("crm", "CRMEnrichmentFieldMapping")
    for source_key, target_doctype, target_fieldname, *_ in FIELD_MAPPINGS:
        CRMEnrichmentFieldMapping.objects.filter(
            source_key=source_key, target_doctype=target_doctype, target_fieldname=target_fieldname
        ).delete()


class Migration(migrations.Migration):
    dependencies = [("crm", "0004_crmenrichmentfieldmapping_crmenrichmentrun_and_more")]
    operations = [migrations.RunPython(seed_enrichment_defaults, unseed_enrichment_defaults)]
