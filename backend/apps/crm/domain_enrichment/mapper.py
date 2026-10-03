# Ported from crm/domain_enrichment/mapper.py (frappe/crm, AGPL-3.0)
"""Single source of result -> CRM field logic, driven by Field Mapping records.

``apply_to_document`` is the ONLY place that translates an ``EnrichmentResult``
into CRM document fields. The link-time Organization -> Lead/Deal copy
(``apps/crm/cross_record.py``) reuses it, so all the write-policy / has-field /
never-overwrite guards live here once.
"""

from __future__ import annotations

import logging
from urllib.parse import urlparse

from django.db.models import ForeignKey

from .crawler import registrable_domain

logger = logging.getLogger(__name__)

_SOURCE_KEY_LABELS = {
    "company_name": "Organization Name",
    "description": "Company Description",
    "logo": "Logo",
    "industry": "Industry",
    "primary_email": "Email",
    "primary_phone": "Phone",
    "secondary_phone": "Phone",
    "linkedin": "LinkedIn",
    "twitter": "X (Twitter)",
    "github": "GitHub",
    "facebook": "Facebook",
    "instagram": "Instagram",
    "youtube": "YouTube",
}

_SOCIAL_KEYS = ("linkedin", "twitter", "github", "facebook", "instagram", "youtube")

POLICY_FILL_IF_EMPTY = "Fill if empty"
POLICY_ALWAYS_REFRESH = "Always refresh"
POLICY_OVERRIDE_DEFAULTS = "Override defaults"


def _first_email(result) -> str:
    if not result.emails:
        return ""
    registrable = registrable_domain(urlparse(result.website or "").netloc)
    if registrable:
        for e in result.emails:
            domain = e.value.lower().split("@")[-1]
            if domain == registrable or domain.endswith("." + registrable):
                return e.value
    return result.emails[0].value


def _phone_at(result, index: int) -> str:
    if not result.phones:
        return ""
    if index >= len(result.phones):
        index = 0
    p = result.phones[index]
    return p.raw or p.value


def get_value_for_source_key(result, source_key: str):
    if source_key == "company_name":
        return result.company_name.value or ""
    if source_key == "description":
        return result.description.value or ""
    if source_key == "logo":
        return result.logo.value or ""
    if source_key == "image":
        return result.image.value or ""
    if source_key == "industry":
        return result.industry.value or ""
    if source_key == "primary_email":
        return _first_email(result)
    if source_key == "primary_phone":
        return _phone_at(result, 0)
    if source_key == "secondary_phone":
        return _phone_at(result, 1)
    if source_key in _SOCIAL_KEYS:
        profile = result.social_profiles.get(source_key)
        return profile.value if profile else ""
    return ""


def _get_field(doc, fieldname):
    try:
        return type(doc)._meta.get_field(fieldname)
    except Exception:
        return None


def _has_field(doc, fieldname) -> bool:
    return _get_field(doc, fieldname) is not None


def _get_value(doc, fieldname):
    field_obj = _get_field(doc, fieldname)
    if isinstance(field_obj, ForeignKey):
        return getattr(doc, field_obj.attname)
    return getattr(doc, fieldname, None)


def _set_value(doc, fieldname, value):
    field_obj = _get_field(doc, fieldname)
    if isinstance(field_obj, ForeignKey):
        setattr(doc, field_obj.attname, value)
    else:
        setattr(doc, fieldname, value)


def _ensure_link_target(doc, target_fieldname: str, value: str):
    """For a Link (ForeignKey) field with ``create_missing_link`` set, auto-create
    the linked lookup row if missing. Returns the value to write, or None to
    skip the field (only on an unexpected error -- there's no per-field create
    permission check in this port, unlike the original's frappe.has_permission
    gate, so this is opt-in-and-trusted rather than permission-respecting)."""
    field_obj = _get_field(doc, target_fieldname)
    if not isinstance(field_obj, ForeignKey):
        return value

    related_model = field_obj.related_model
    if related_model.objects.filter(pk=value).exists():
        return value

    try:
        # Lookup models in this codebase key on the human-readable value itself
        # (CRMIndustry.name IS "Software"), so get_or_create(name=value) both
        # finds and creates by the same identity the mapper is writing.
        related_model.objects.get_or_create(pk=value)
        return value
    except Exception:
        logger.warning("Domain Enrichment: could not create link master %s=%r for %s.%s",
                        related_model.__name__, value, type(doc).__name__, target_fieldname)
        return None


def _label_for(doc, source_key: str, target_fieldname: str) -> str:
    label = _SOURCE_KEY_LABELS.get(source_key)
    if label:
        return label
    field_obj = _get_field(doc, target_fieldname)
    return str(field_obj.verbose_name) if field_obj is not None else target_fieldname


def _overridable_defaults(mapping) -> set:
    defaults = {""}
    for line in (mapping.default_values or "").splitlines():
        token = line.strip()
        if token:
            defaults.add(token)
    return defaults


def apply_to_document(doc, result, cfg, fill_empty_only: bool = False) -> list[str]:
    """Populate mappable fields on a Lead / Deal / Organization from ``result``.

    Does NOT save the document -- the caller controls persistence. Returns the
    human labels of the fields that were changed.
    """
    filled: list[str] = []
    mappings = cfg.mappings_by_doctype.get(doc.doctype_label, [])

    for mapping in mappings:
        fieldname = mapping.target_fieldname
        if not _has_field(doc, fieldname):
            continue
        value = get_value_for_source_key(result, mapping.source_key)
        label = _label_for(doc, mapping.source_key, fieldname)
        current = _get_value(doc, fieldname)
        policy = POLICY_FILL_IF_EMPTY if fill_empty_only else (mapping.write_policy or POLICY_FILL_IF_EMPTY)

        if policy == POLICY_ALWAYS_REFRESH:
            if not value or current == value:
                continue
            if mapping.create_missing_link:
                value = _ensure_link_target(doc, fieldname, value)
                if value is None:
                    continue
            _set_value(doc, fieldname, value)
            if label not in filled:
                filled.append(label)
            continue

        if not value:
            continue

        if policy == POLICY_OVERRIDE_DEFAULTS:
            overridable = _overridable_defaults(mapping)
            if current and current not in overridable:
                continue
        else:  # Fill if empty
            if current:
                continue

        if current == value:
            continue

        if mapping.create_missing_link:
            value = _ensure_link_target(doc, fieldname, value)
            if value is None:
                continue

        _set_value(doc, fieldname, value)
        if label not in filled:
            filled.append(label)

    return filled
