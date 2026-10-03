# Ported from crm/api/onboarding.py (frappe/crm, AGPL-3.0).
from __future__ import annotations


def get_first_lead(name: str | None = None) -> str | None:
    from apps.crm.doctype.lead.lead import CRMLead

    if name and CRMLead.objects.filter(pk=name, converted=False).exists():
        return name

    lead = CRMLead.objects.filter(converted=False).order_by("creation").values_list("pk", flat=True).first()
    return lead


def get_first_deal(name: str | None = None) -> str | None:
    from apps.crm.doctype.deal.deal import CRMDeal

    if name and CRMDeal.objects.filter(pk=name).exists():
        return name

    deal = CRMDeal.objects.order_by("creation").values_list("pk", flat=True).first()
    return deal
