# A generic field-metadata endpoint the frontend's form/list engine needs
# (mirrors the shape of Frappe's own frappe.client.get_doc_meta / get_meta --
# see data/document.js in the ported frontend, which is metadata-driven: it
# resolves fetch_from, checks mandatory fields, and renders generic list/form
# layouts entirely from a doctype's field list rather than per-page markup).
# No such endpoint existed in this Django port before; it's new infrastructure
# built specifically so that port can work against real data instead of
# hand-written per-page field lists.
from django.db import models as djmodels

_FIELDTYPE_MAP = [
    (djmodels.ForeignKey, "Link"),
    (djmodels.BooleanField, "Check"),
    (djmodels.EmailField, "Data"),
    (djmodels.DecimalField, "Currency"),
    (djmodels.FloatField, "Float"),
    (djmodels.DurationField, "Duration"),
    (djmodels.DateTimeField, "Datetime"),
    (djmodels.DateField, "Date"),
    (djmodels.TimeField, "Time"),
    (djmodels.IntegerField, "Int"),
    (djmodels.TextField, "Text"),
    (djmodels.CharField, "Data"),
]


# Fields that are a plain Django TextField here but a Frappe "Text Editor"
# (rich HTML, not plain long-text) on the doctype they were ported from --
# _fieldtype_for() can't tell these apart from field class alone, so this is
# a short explicit allowlist rather than a new Django field type.
_TEXT_EDITOR_FIELDS = {
    ("CRM Task", "description"),
    ("FCRM Note", "content"),
}

# Same idea for field labels: get_doctype_meta() titleizes the Django field
# name (lead_name -> "Lead Name"), which matches the source doctype's
# declared `label` almost everywhere -- these two are the confirmed
# exceptions (crm_lead.json / crm_deal.json).
_LABEL_OVERRIDES = {
    ("CRM Lead", "lead_name"): "Full Name",
    ("CRM Deal", "email"): "Primary email",
}


_FIELD_OVERRIDES = {
    ("CRM Call Log", "receiver"): {"label": "Call Received By", "depends_on": "eval:doc.type == 'Incoming'"},
    ("CRM Call Log", "caller"): {"label": "Caller", "depends_on": "eval:doc.type == 'Outgoing'"},
}


def _fieldtype_for(field, doctype_label: str = "") -> str:
    if (doctype_label, field.name) in _TEXT_EDITOR_FIELDS:
        return "Text Editor"
    for cls, label in _FIELDTYPE_MAP:
        if isinstance(field, cls):
            return label
    return "Data"


def _standard_filter_fieldnames(doctype_label: str) -> set:
    from apps.crm.doctype.quick_filter_override.quick_filter_override import QuickFilterOverride

    return set(
        QuickFilterOverride.objects.filter(doctype_label=doctype_label, in_standard_filter=True).values_list(
            "fieldname", flat=True
        )
    )


def get_doctype_meta(doctype_label: str) -> dict | None:
    from apps.crm.doctype_registry import get_doctype_model

    model = get_doctype_model(doctype_label)
    if model is None:
        return None

    standard_filter_fields = _standard_filter_fieldnames(doctype_label)

    fields = []
    for f in model._meta.get_fields():
        if not hasattr(f, "attname"):
            continue  # reverse relations / child-table managers, not real columns
        if f.name in ("id",) and f.name != model._meta.pk.name:
            continue

        auto_label = getattr(f, "verbose_name", f.name).title() if isinstance(getattr(f, "verbose_name", None), str) else f.name
        entry = {
            "fieldname": f.name,
            "label": _LABEL_OVERRIDES.get((doctype_label, f.name), auto_label),
            "fieldtype": _fieldtype_for(f, doctype_label),
            "reqd": 0 if getattr(f, "blank", True) else 1,
            "read_only": 0 if getattr(f, "editable", True) else 1,
            "hidden": 0,
            "in_standard_filter": 1 if f.name in standard_filter_fields else 0,
        }
        if isinstance(f, djmodels.ForeignKey):
            # doctype_label (a few models set it explicitly) wins if present;
            # otherwise every model's Meta.verbose_name is already the real
            # "CRM Xyz" doctype name (set on every doctype in this port), so
            # prefer that over the bare Python class name.
            related_meta = f.related_model._meta
            entry["options"] = getattr(f.related_model, "doctype_label", None) or str(related_meta.verbose_name)
        choices = getattr(f, "choices", None)
        if choices:
            entry["options"] = "\n".join(c[0] for c in choices)
            entry["fieldtype"] = "Select"
        entry.update(_FIELD_OVERRIDES.get((doctype_label, f.name), {}))
        fields.append(entry)

    return {
        "doctype": doctype_label,
        "name_field": model._meta.pk.name,
        "fields": fields,
    }
