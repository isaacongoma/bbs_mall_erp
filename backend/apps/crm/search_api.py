# Ported from Frappe's frappe.desk.search.search_link -- the generic
# doctype-autocomplete RPC every Link field control in the frontend calls
# (see frontend/src/components/Controls/Link.vue). Frappe's version searches
# a doctype's configured `search_fields` / title_field plus its name; we have
# no such per-doctype config table, so this searches every Data/Text field
# from the generic meta (apps/core/meta.py) instead -- functionally
# equivalent (matches on any visible text field) without hand-maintaining a
# search-fields list per doctype.
from __future__ import annotations

from django.db.models import Q

from apps.core.meta import get_doctype_meta
from apps.crm.doctype_registry import get_doctype_model
from apps.crm.query_utils import build_q, lookup_order_field

_TEXT_FIELDTYPES = {"Data", "Text", "Small Text", "Long Text"}


def _normalize_filters(filters) -> dict:
    if not filters:
        return {}
    if isinstance(filters, dict):
        return filters
    if isinstance(filters, (list, tuple)):
        normalized = {}
        for item in filters:
            if not isinstance(item, (list, tuple)):
                continue
            if len(item) == 3:
                field, op, value = item
            elif len(item) == 4:
                _doctype, field, op, value = item
            else:
                continue
            normalized[field] = value if op in ("=", "like") else [op, value]
        return normalized
    return {}


def _search_users(txt: str, page_length: int) -> list[dict]:
    from apps.core.models import User

    qs = User.objects.filter(is_active=True)
    if txt:
        qs = qs.filter(
            Q(email__icontains=txt) | Q(first_name__icontains=txt) | Q(last_name__icontains=txt)
        )
    qs = qs.order_by("first_name", "last_name")[:page_length]
    return [
        {
            "value": str(u.pk),
            "label": u.get_full_name() or u.email,
            "description": u.email,
        }
        for u in qs
    ]


# Ported from crm/api/contact.py's search_emails (frappe/crm, AGPL-3.0).
# EmailMultiSelect.vue calls this to autocomplete To/Cc/Bcc fields against
# Contacts with a set email_id. Enabled/disabled-flag filtering is dropped --
# our Contact model has no such fields (Frappe's is conditional on the meta
# too, so this isn't a divergence from a real installed schema).
def search_emails(txt: str = "") -> list[list[str]]:
    from apps.core.contacts import contact_model

    qs = contact_model().objects.exclude(email_id="").exclude(email_id__isnull=True)
    if txt:
        qs = qs.filter(Q(full_name__icontains=txt) | Q(email_id__icontains=txt) | Q(name__icontains=txt))
    qs = qs.order_by("email_id", "full_name", "name")[:20]
    return [[c.full_name, c.email_id, c.name] for c in qs]


def search_link(doctype: str, txt: str = "", filters=None, page_length: int = 20) -> list[dict]:
    if doctype == "User":
        return _search_users(txt, page_length)

    model = get_doctype_model(doctype)
    if model is None:
        return []

    qs = model.objects.filter(build_q(_normalize_filters(filters)))

    if txt:
        meta = get_doctype_meta(doctype) or {"fields": []}
        searchable = [f["fieldname"] for f in meta["fields"] if f["fieldtype"] in _TEXT_FIELDTYPES]
        text_q = Q(pk__icontains=txt)
        for fieldname in searchable:
            text_q |= Q(**{f"{fieldname}__icontains": txt})
        qs = qs.filter(text_q)

    qs = qs.order_by(lookup_order_field(model)).distinct()[:page_length]

    results = []
    for obj in qs:
        pk = str(obj.pk)
        label = str(obj).strip() or pk
        results.append({"value": pk, "label": label, "description": None})
    return results
