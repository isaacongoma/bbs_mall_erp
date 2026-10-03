# Ported from crm/integrations/api.py's get_contact/get_contact_by_phone_number
# (frappe/crm, AGPL-3.0)
#
# The original normalizes with `phonenumbers` (libphonenumber) via
# crm.utils.parse_phone_number/are_same_phone_number, so "+1 415-555-0100" and
# "(415) 555-0100" resolve to the same record. This strips to digits-only and
# matches on a substring/tail instead -- same intent (match despite
# formatting), simpler implementation, no fuzzy country inference.
import re


def _clean(phone: str) -> str:
    return re.sub(r"[\s\-()+]", "", phone or "")


def get_contact(phone_number: str) -> dict:
    """Resolve a phone number to a Contact (+ its primary Deal, if any) or a
    Lead. Mirrors the original's fallback chain: Contact (any of its phone_nos)
    -> Lead.mobile_no -> a bare {"mobile_no": phone_number}."""
    from apps.core.doctype.contact.contact import Contact
    from apps.core.doctype.contact_phone.contact_phone import ContactPhone
    from apps.crm.doctype.deal_contacts.deal_contacts import CRMDealContact
    from apps.crm.doctype.lead.lead import CRMLead

    if not phone_number:
        return {"mobile_no": phone_number}

    cleaned = _clean(phone_number)
    if not cleaned:
        return {"mobile_no": phone_number}

    phone_row = ContactPhone.objects.filter(phone__icontains=cleaned).order_by("-parent__modified").first()
    if phone_row:
        contact = Contact.objects.filter(pk=phone_row.parent_id).first()
        if contact:
            result = {
                "name": contact.pk, "full_name": contact.full_name, "image": contact.image,
                "mobile_no": contact.mobile_no,
            }
            primary_link = CRMDealContact.objects.filter(contact=contact, is_primary=True).first()
            if primary_link:
                result["deal"] = primary_link.parent_deal_id
            return result

    lead = (
        CRMLead.objects.filter(converted=False, mobile_no__icontains=cleaned)
        .order_by("-modified")
        .first()
    )
    if lead:
        return {"name": lead.pk, "full_name": lead.lead_name, "image": lead.image, "mobile_no": lead.mobile_no, "lead": lead.pk}

    return {"mobile_no": phone_number}


def get_contact_by_phone_number(phone_number: str) -> dict:
    return get_contact(phone_number)


def get_contact_lead_or_deal_from_number(number: str):
    """Returns (docname, doctype) for the best match, or (None, None)."""
    contact = get_contact_by_phone_number(number)
    if contact.get("name"):
        doctype, docname = "Contact", contact["name"]
        if contact.get("lead"):
            doctype, docname = "CRM Lead", contact["lead"]
        elif contact.get("deal"):
            doctype, docname = "CRM Deal", contact["deal"]
        return docname, doctype
    return None, None
