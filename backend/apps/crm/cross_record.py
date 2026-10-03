# Ported from crm/domain_enrichment/cross_record.py (frappe/crm, AGPL-3.0)
"""Link-time Organization -> Lead/Deal enrichment copy.

The ONLY cross-record behaviour in Domain Enrichment: when a Lead or Deal links
an already-enriched CRM Organization, synchronously copy that Organization's
stored enriched fields onto the *empty* fields of the Lead/Deal (fill-empty).
The direction is strictly Organization -> Lead/Deal, in-request, on the origin
save. There is no background job, no fan-out, and no write back to the
Organization.

Reuses ``mapper.apply_to_document`` -- the single result->field authority --
by wrapping the Organization's stored values in an EnrichmentResult. No
crawling happens here; this is a pure record-to-record copy.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_ORG_ENRICHED_FIELDS = ("company_description", "organization_logo", "industry_id", "linkedin", "twitter", "facebook")


def _is_org_enriched(organization) -> bool:
    from apps.crm.doctype.enrichment_run.enrichment_run import CRMEnrichmentRun

    has_completed_run = CRMEnrichmentRun.objects.filter(
        reference_doctype="CRM Organization", reference_name=organization.pk, status="Completed"
    ).exists()
    if has_completed_run:
        return True
    return any(getattr(organization, field, None) for field in _ORG_ENRICHED_FIELDS)


def _result_from_organization(organization):
    from apps.crm.domain_enrichment.result import EnrichmentResult, Field, SocialProfile

    result = EnrichmentResult(website=organization.website or "")
    result.company_name = Field(value=organization.organization_name or "")
    result.description = Field(value=organization.company_description or "")
    result.logo = Field(value=organization.organization_logo or "")
    result.industry = Field(value=organization.industry_id or "")
    for network in ("linkedin", "twitter", "facebook"):
        value = getattr(organization, network, None)
        if value:
            result.social_profiles[network] = SocialProfile(value=value)
    return result


def copy_enrichment_from_organization(target_doc, organization) -> list[str]:
    """Copy enriched fields from `organization` onto target_doc (a CRMLead or
    CRMDeal instance). Mutates target_doc in place and does not save it -- the
    caller's own save() persists the changes. Best-effort: never raises."""
    try:
        if not organization or not _is_org_enriched(organization):
            return []

        from apps.crm.domain_enrichment import mapper
        from apps.crm.domain_enrichment.config import get_config

        cfg = get_config()
        result = _result_from_organization(organization)
        return mapper.apply_to_document(target_doc, result, cfg, fill_empty_only=True)
    except Exception:
        logger.exception("Domain Enrichment: Org -> Lead/Deal copy failed for %s %s", type(target_doc).__name__, target_doc.pk)
        return []
