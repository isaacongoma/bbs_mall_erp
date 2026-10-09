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
    from apps.core import contacts

    if not contacts.contact_model().objects.filter(pk=contact).exists():
        raise PermissionDenied("Not permitted")

    if field == "email":
        contacts.add_email(contact, value)
    elif field in ("mobile_no", "phone"):
        contacts.add_phone(contact, value, "mobile_no")
    else:
        raise ValueError("Invalid field")
    return True


def set_as_primary(contact: str, field: str, value: str) -> bool:
    from apps.core import contacts

    if not contacts.contact_model().objects.filter(pk=contact).exists():
        raise PermissionDenied("Not permitted")

    if field not in ("email", "mobile_no", "phone"):
        raise ValueError("Invalid field")
    contacts.set_primary(contact, field, value)
    return True
