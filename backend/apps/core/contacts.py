from apps.erpnext.registry import get_model
from apps.frappe.runtime import get_doc


def contact_model():
    return get_model("Contact")


def email_model():
    return get_model("Contact Email")


def phone_model():
    return get_model("Contact Phone")


def find_by_email(email):
    if not email:
        return None
    row = email_model().objects.filter(parenttype="Contact", email_id=email).first()
    return contact_model().objects.filter(pk=row.parent).first() if row else None


def find_by_phone(number, partial=False):
    if not number:
        return None
    lookup = {"phone__icontains": number} if partial else {"phone": number}
    row = phone_model().objects.filter(parenttype="Contact", **lookup).order_by("-modified").first()
    return contact_model().objects.filter(pk=row.parent).first() if row else None


def email_rows(contact_name):
    return email_model().objects.filter(parenttype="Contact", parent=contact_name).order_by("idx")


def phone_rows(contact_name):
    return phone_model().objects.filter(parenttype="Contact", parent=contact_name).order_by("idx")


def create_contact(first_name="", last_name="", email=None, phone=None, mobile_no=None, **fields):
    values = {"doctype": "Contact", "first_name": first_name or "", "last_name": last_name or ""}
    values.update({key: value for key, value in fields.items() if value not in (None, "")})
    if email:
        values["email_ids"] = [{"email_id": email, "is_primary": 1}]
    phone_nos = []
    if phone:
        phone_nos.append({"phone": phone, "is_primary_phone": 1})
    if mobile_no:
        phone_nos.append({"phone": mobile_no, "is_primary_mobile_no": 1})
    if phone_nos:
        values["phone_nos"] = phone_nos
    document = get_doc(values)
    document.flags.ignore_links = True
    document.insert(ignore_permissions=True, ignore_links=True)
    return contact_model().objects.get(pk=document.name)


def _save(document):
    document.flags.ignore_links = True
    document.save(ignore_permissions=True)


def add_email(contact_name, email):
    document = get_doc("Contact", contact_name, ignore_permissions=True)
    document.append("email_ids", {"email_id": email, "is_primary": 0 if document.get("email_ids") else 1})
    _save(document)


def add_phone(contact_name, phone, field="mobile_no"):
    document = get_doc("Contact", contact_name, ignore_permissions=True)
    flag = "is_primary_mobile_no" if field == "mobile_no" else "is_primary_phone"
    document.append("phone_nos", {"phone": phone, flag: 0 if document.get("phone_nos") else 1})
    _save(document)


def set_primary(contact_name, field, value):
    document = get_doc("Contact", contact_name, ignore_permissions=True)
    if field == "email":
        for row in document.get("email_ids"):
            row.is_primary = 1 if row.email_id == value else 0
    else:
        flag = "is_primary_mobile_no" if field == "mobile_no" else "is_primary_phone"
        for row in document.get("phone_nos"):
            setattr(row, flag, 1 if row.phone == value else 0)
    _save(document)
