# Ported from crm/domain_enrichment/tasks.py (frappe/crm, AGPL-3.0)
# frappe.enqueue -> Celery task; frappe.publish_realtime -> Django Channels group
# send (a WebSocket consumer subscribing to "enrichment_<user id>" is a frontend-side
# piece not built yet -- this publishes the same event shape either way).
# telemetry.capture (Frappe Cloud analytics) has no equivalent here and is dropped.
"""Background worker + the single run-writer.

``run_enrichment`` is the Celery task: it runs the pipeline (streaming progress
over the channel layer), writes a ``CRM Enrichment Run`` history record, applies
the mapper to the origin document, and publishes a terminal event. It never
raises to the worker -- every failure is recorded on the Run, logged, and
reported over the channel layer.
"""

from __future__ import annotations

import logging
import traceback

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .config import _setting, auto_enrich_enabled_for, get_config, get_settings
from .mapper import apply_to_document
from .pipeline import PROGRESS_STEPS
from .pipeline import run as run_pipeline

logger = logging.getLogger(__name__)

PROGRESS_EVENT = "domain_enrichment_progress"
TOTAL_STEPS = len(PROGRESS_STEPS)


def _publish(reference_doctype, reference_name, status, message="", step=0, payload=None, user=None):
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        if channel_layer is None or not user:
            return
        async_to_sync(channel_layer.group_send)(
            f"enrichment_{user}",
            {
                "type": "enrichment.progress",
                "event": PROGRESS_EVENT,
                "reference_doctype": reference_doctype,
                "reference_name": reference_name,
                "step": step,
                "total": TOTAL_STEPS,
                "message": message,
                "status": status,
                "payload": payload or {},
            },
        )
    except Exception:
        pass  # realtime is best-effort


def write_run(
    reference_doctype: str, reference_name: str, website: str, status: str,
    result=None, started_on=None, notes: str = "",
) -> str:
    """Persist exactly one CRM Enrichment Run from an EnrichmentResult."""
    import json

    from apps.crm.doctype.enrichment_run.enrichment_run import CRMEnrichmentRun

    run_doc = CRMEnrichmentRun(
        reference_doctype=reference_doctype,
        reference_name=reference_name,
        source_website=website,
        status=status,
        started_on=started_on or timezone.now(),
    )
    if status in ("Completed", "Failed"):
        run_doc.finished_on = timezone.now()
    if notes:
        run_doc.notes = notes

    if result is not None:
        social = ", ".join(sorted(k for k, v in result.social_profiles.items() if v.value))
        run_doc.company_name = result.company_name.value or ""
        run_doc.industry = result.industry.value or ""
        run_doc.industry_confidence = result.industry_confidence or 0
        run_doc.emails_found = len(result.emails)
        run_doc.phones_found = len(result.phones)
        run_doc.social_profiles = social
        run_doc.raw_json = json.dumps(result.to_dict())
        if not notes and result.notes:
            run_doc.notes = "\n".join(result.notes)

    run_doc.save()
    return run_doc.name


def enqueue_enrichment(
    reference_doctype: str, reference_name: str, website: str, user, trigger: str = "manual"
) -> dict:
    """Enqueue one run_enrichment job. The single place the job is enqueued --
    shared by the manual (api.enrich/api.retry) and auto (after-insert) paths."""
    s = get_settings()
    timeout = int(_setting(s, "request_timeout")) * int(_setting(s, "max_pages")) + 60
    job_id = f"domain-enrich-{reference_doctype}-{reference_name}"
    run_enrichment.apply_async(
        kwargs=dict(
            reference_doctype=reference_doctype, reference_name=reference_name,
            website=website, user=user, trigger=trigger,
        ),
        task_id=job_id, time_limit=timeout,
    )
    return {"queued": True, "job_id": job_id, "website": website}


def auto_enrich_on_create(doc):
    """Auto-enqueue enrichment for a new CRM record. Called from the save() of
    the CRM Lead / CRM Deal / CRM Organization models on first insert."""
    try:
        if not auto_enrich_enabled_for(doc.doctype_label):
            return

        website = (getattr(doc, "website", "") or "").strip()
        if not website:
            return

        from apps.core.middleware import get_current_user

        user = get_current_user()
        user_id = user.pk if user and getattr(user, "is_authenticated", False) else None
        enqueue_enrichment(doc.doctype_label, doc.pk, website, user_id, trigger="auto")
    except Exception:
        logger.exception("Domain Enrichment: auto_enrich_on_create failed")


@shared_task(bind=True)
def run_enrichment(self, reference_doctype: str, reference_name: str, website: str, user=None, trigger: str = "manual"):
    """Enqueued worker: crawl, map onto the origin doc, write a Run, stream progress."""
    started_on = timezone.now()

    def progress(step_index, message=""):
        _publish(reference_doctype, reference_name, status="running", message=message, step=step_index, user=user)

    try:
        cfg = get_config()
        _publish(reference_doctype, reference_name, status="running", message="Starting", step=0, user=user)

        result = run_pipeline(website, cfg=cfg, progress=progress)

        from apps.crm.doctype_registry import get_doctype_model

        model = get_doctype_model(reference_doctype)
        doc = model.objects.get(pk=reference_name)
        filled_fields = apply_to_document(doc, result, cfg)
        if filled_fields:
            doc.save()

        write_run(reference_doctype, reference_name, website, status="Completed", result=result, started_on=started_on)

        _publish(
            reference_doctype, reference_name, status="completed", message="Completed", step=TOTAL_STEPS - 1,
            payload={"filled_fields": filled_fields, "notes": result.notes, **result.flat()}, user=user,
        )
    except Exception:
        transaction.set_rollback(True)
        logger.exception("Domain Enrichment: run_enrichment failed")
        try:
            write_run(
                reference_doctype, reference_name, website, status="Failed",
                started_on=started_on, notes=traceback.format_exc()[:1000],
            )
        except Exception:
            logger.exception("Domain Enrichment: could not write Failed run")
        _publish(
            reference_doctype, reference_name, status="error",
            message="Enrichment failed. Check the error log.", step=0, user=user,
        )
