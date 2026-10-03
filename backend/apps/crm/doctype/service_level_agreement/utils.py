# Ported from crm/fcrm/doctype/crm_service_level_agreement/utils.py (frappe/crm, AGPL-3.0)
from django.utils import timezone

from apps.crm.doctype.service_level_agreement.condition_eval import UnsafeConditionError, evaluate_condition


def get_sla(doc):
    """doc: an unsaved-or-saved CRMLead/CRMDeal instance. Returns the matching
    CRMServiceLevelAgreement, or None."""
    from apps.crm.doctype.service_level_agreement.service_level_agreement import CRMServiceLevelAgreement

    now = timezone.now()
    doctype_label = doc.doctype_label
    priority = doc.communication_status_id

    qs = CRMServiceLevelAgreement.objects.filter(apply_on=doctype_label, enabled=True).filter(
        _start_ok(now)
    ).filter(_end_ok(now))

    if priority:
        qs = qs.filter(priorities__priority_id=priority)

    sla_list = list(qs.distinct())
    default_sla = next((sla for sla in sla_list if sla.default), None)
    if default_sla:
        sla_list = [sla for sla in sla_list if sla.pk != default_sla.pk] + [default_sla]

    doc_context = _as_context(doc)
    for sla in sla_list:
        if not sla.condition:
            return sla
        try:
            if evaluate_condition(sla.condition, doc_context):
                return sla
        except UnsafeConditionError:
            continue
    return None


def _start_ok(now):
    from django.db.models import Q

    return Q(start_date__isnull=True) | Q(start_date__lte=now)


def _end_ok(now):
    from django.db.models import Q

    return Q(end_date__isnull=True) | Q(end_date__gte=now)


def _as_context(doc):
    """Mirrors get_context()'s `doc.as_dict()` -- a plain dict of the
    document's own column values, safe to hand to the condition evaluator."""
    return {
        field.name: getattr(doc, field.attname, None)
        for field in doc._meta.fields
    }
