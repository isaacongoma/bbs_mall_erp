# Ported verbatim from crm/domain_enrichment/result.py (frappe/crm, AGPL-3.0)
# No framework coupling in the original -- none needed here either.
"""EnrichmentResult schema. Preserves the {value, source, method} provenance shape.

Every piece of evidence keeps a ``source`` URL so any field can be traced back to
the page it was extracted from. Dataclasses serialize to plain dicts/JSON via
``to_dict()`` so the result can be returned by the engine and stored by the mapper /
run-writer without any framework coupling.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field


class Method:
    JSON_LD = "JSON-LD"
    META_TAG = "Meta Tag"
    TITLE_TAG = "Title Tag"
    BODY_TEXT = "Body Text"
    FAVICON = "Favicon"
    REGEX = "Regex"
    TEL_LINK = "tel: link"
    TEXT_HEURISTIC = "Text Heuristic"
    KEYWORD_CLASSIFIER = "Keyword Classifier"
    SOCIAL_RULE = "Social Rule"


@dataclass
class Email:
    value: str
    source: str = ""
    method: str = Method.REGEX

    def to_dict(self):
        return {"value": self.value, "source": self.source, "method": self.method}


@dataclass
class Phone:
    value: str
    raw: str = ""
    source: str = ""
    method: str = Method.REGEX

    def to_dict(self):
        return {"value": self.value, "raw": self.raw, "source": self.source, "method": self.method}


@dataclass
class Field:
    value: object = ""
    source: str = ""
    method: str = ""

    def to_dict(self):
        return {"value": self.value, "source": self.source, "method": self.method}


@dataclass
class SocialProfile:
    value: str = ""
    source: str = ""
    method: str = Method.SOCIAL_RULE

    def to_dict(self):
        return {"value": self.value, "source": self.source, "method": self.method}


@dataclass
class EnrichmentResult:
    website: str = ""
    company_name: Field = field(default_factory=Field)
    description: Field = field(default_factory=Field)
    logo: Field = field(default_factory=Field)
    image: Field = field(default_factory=Field)
    industry: Field = field(default_factory=Field)
    industry_confidence: float = 0.0

    emails: list = field(default_factory=list)
    phones: list = field(default_factory=list)
    social_profiles: dict = field(default_factory=dict)

    pages_crawled: list = field(default_factory=list)
    errors: list = field(default_factory=list)
    notes: list = field(default_factory=list)

    def to_dict(self):
        return {
            "company_name": self.company_name.to_dict(),
            "description": self.description.to_dict(),
            "logo": self.logo.to_dict(),
            "image": self.image.to_dict(),
            "industry": self.industry.to_dict(),
            "industry_confidence": round(self.industry_confidence, 2),
            "emails": [e.to_dict() for e in self.emails],
            "phones": [p.to_dict() for p in self.phones],
            "social_profiles": {k: v.to_dict() for k, v in self.social_profiles.items()},
            "_meta": {
                "website": self.website,
                "pages_crawled": self.pages_crawled,
                "errors": self.errors,
                "notes": self.notes,
            },
        }

    def flat(self):
        return {
            "company_name": self.company_name.value,
            "description": self.description.value,
            "logo": self.logo.value,
            "industry": self.industry.value,
            "industry_confidence": round(self.industry_confidence, 2),
            "social_profiles": {k: v.value for k, v in self.social_profiles.items()},
        }


@dataclass
class CrawledPage:
    url: str
    status_code: int = 0
    html: str = ""
    text: str = ""
    title: str = ""
    headings: list = field(default_factory=list)
    error: str = ""

    def to_dict(self):
        return asdict(self)
