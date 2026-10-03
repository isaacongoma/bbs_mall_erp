# Ported from crm/api/contact.py (frappe/crm, AGPL-3.0). CRM Deal links to
# a Contact via a direct FK here (CRMDeal.contact) rather than vendor's
# generic "CRM Contacts" child-table (used there because a Deal can carry
# several linked contacts); this port only ever needed one, so
# get_linked_deals is a plain filter instead of a child-table join.
from __future__ import annotations

from django.core.exceptions import PermissionDenied


def get_linked_deals(contact: str) -> list[dict]:
    from apps.crm.doctype.deal.deal import CRMDeal

    deals = CRMDeal.objects.filter(contact_id=contact).values(
        "name", "organization", "currency", "deal_value", "status", "email", "mobile_no", "deal_owner", "modified",
    )
    return list(deals)


def create_new(contact: str, field: str, value: str) -> bool:
    from apps.core.models import Contact

    doc = Contact.objects.filter(pk=contact).first()
    if doc is None:
        raise PermissionDenied("Not permitted")

    if field == "email":
        doc.email_ids.create(email_id=value, is_primary=not doc.email_ids.exists())
    elif field in ("mobile_no", "phone"):
        doc.phone_nos.create(phone=value, is_primary_mobile_no=not doc.phone_nos.exists())
    else:
        raise ValueError("Invalid field")

    doc.save()  # refresh denormalized email_id/phone/mobile_no
    return True


def set_as_primary(contact: str, field: str, value: str) -> bool:
    from apps.core.models import Contact

    doc = Contact.objects.filter(pk=contact).first()
    if doc is None:
        raise PermissionDenied("Not permitted")

    if field == "email":
        doc.email_ids.update(is_primary=False)
        doc.email_ids.filter(email_id=value).update(is_primary=True)
    elif field in ("mobile_no", "phone"):
        attr = "is_primary_mobile_no" if field == "mobile_no" else "is_primary_phone"
        doc.phone_nos.update(**{attr: False})
        doc.phone_nos.filter(phone=value).update(**{attr: True})
    else:
        raise ValueError("Invalid field")

    doc.save()  # refresh denormalized email_id/phone/mobile_no
    return True
