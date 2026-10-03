# Ported from crm/domain_enrichment/api.py (frappe/crm, AGPL-3.0)
# frappe.whitelist + rate_limit -> DRF views + DRF's own throttle classes.
"""Entry points: ``enrich`` (enqueue a full run for a record) and ``retry``
(re-run one from its Run history)."""

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from .config import ENRICHABLE_DOCTYPES, EnrichmentConfig, get_config
from .tasks import enqueue_enrichment


class EnrichRateThrottle(UserRateThrottle):
    rate = "10/min"


def _enabled_doctypes(cfg: EnrichmentConfig) -> list[str]:
    if not cfg.setting("enabled"):
        return []
    return list(ENRICHABLE_DOCTYPES)


def _enqueue_run(cfg, reference_doctype: str, reference_name: str, website: str, user) -> dict:
    if reference_doctype not in _enabled_doctypes(cfg):
        raise ValidationError(f"Enrichment is not enabled for {reference_doctype}.")

    from apps.crm.doctype_registry import get_doctype_model

    model = get_doctype_model(reference_doctype)
    if model is None or not model.objects.filter(pk=reference_name).exists():
        raise ValidationError(f"{reference_doctype} {reference_name} not found.")

    website = (website or "").strip()
    if not website:
        raise ValidationError("Set a website on this record before enriching.")

    return enqueue_enrichment(reference_doctype, reference_name, website, user.pk)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([EnrichRateThrottle])
def enrich(request):
    reference_doctype = request.data.get("reference_doctype")
    reference_name = request.data.get("reference_name")

    from apps.crm.doctype_registry import get_doctype_model

    cfg = get_config()
    model = get_doctype_model(reference_doctype)
    doc = model.objects.filter(pk=reference_name).first() if model else None
    website = (getattr(doc, "website", "") or "").strip() if doc else ""
    return Response(_enqueue_run(cfg, reference_doctype, reference_name, website, request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([EnrichRateThrottle])
def retry(request):
    from apps.crm.doctype.enrichment_run.enrichment_run import CRMEnrichmentRun
    from apps.crm.doctype_registry import get_doctype_model

    run_name = request.data.get("run")
    run_doc = CRMEnrichmentRun.objects.filter(pk=run_name).first()
    if not run_doc or not run_doc.reference_doctype or not run_doc.reference_name:
        raise ValidationError("This run has no linked record to re-enrich.")

    cfg = get_config()
    model = get_doctype_model(run_doc.reference_doctype)
    target = model.objects.filter(pk=run_doc.reference_name).first() if model else None
    website = (getattr(target, "website", "") or "").strip() or (run_doc.source_website or "").strip()
    return Response(_enqueue_run(cfg, run_doc.reference_doctype, run_doc.reference_name, website, request.user))
