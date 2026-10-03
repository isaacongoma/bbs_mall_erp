# Ported from frappe/automation_engine/relationships.py + schema_relationships.py
# (frappe/frappe, MIT), scoped to this port's schema.
#
# Real Frappe derives relationships from its live DocType meta system (every Link, child-table
# Link and Dynamic Link field, in both directions, across every installed app). This port has no
# such generic meta system -- apps/crm/doctype_registry.py is a fixed, curated map of the ~30
# doctypes that actually exist -- so relationships are derived the same way, just read off
# Django's own `_meta.get_fields()` instead of a DocType meta row. That covers forward Links
# ("link") and reverse Links ("reverse_link"), which is what every flow this port has seen
# actually needs (assign to the deal's organization, notify the lead's owner, list a contact's
# deals). Child-table Links and Dynamic Links are not derived here -- BBS-ERP's Dynamic-Link-style
# fields (ToDo/DocShare's reference_type/reference_name) are few enough that a flow author who
# needs one can reach it with an Advanced Condition instead of a relationship alias.
from __future__ import annotations

from django.db.models import ForeignKey

MAX_RELATED_ROWS = 1000


def get_relationship_definitions(source_doctype: str | None) -> list[dict]:
    return [_public(d) for d in _definitions(source_doctype)]


def get_relationship_definition(source_doctype: str, relationship: str) -> dict:
    return _public(_definition(source_doctype, relationship))


def get_relationship_targets(source_doctype: str | None, relationships) -> dict[str, str | None]:
    """Validate the flow's predeclared aliases and return {alias: target doctype}."""
    targets: dict[str, str | None] = {"trigger": source_doctype}
    for item in _parse_relationships(relationships):
        _validate_alias(item, targets)
        definition = _definition(targets[item.get("source") or "trigger"], item["relationship"])
        if definition["cardinality"] != "one":
            raise ValueError(f"Relationship {item['relationship']} cannot be used as a single record alias")
        targets[item["alias"]] = definition["target_doctype"]
    return targets


def resolve_relationships(trigger_doc, relationships) -> dict[str, dict]:
    """Resolve the flow's predeclared aliases into {doctype, name} references for one run.
    `trigger_doc` is the live Django model instance the trigger fired on (or None)."""
    records: dict[str, dict] = {}
    if trigger_doc is not None:
        records["trigger"] = _reference(trigger_doc)
    for item in _parse_relationships(relationships):
        source_ref = records.get(item.get("source") or "trigger")
        if not source_ref:
            continue
        source_doc = load_record(source_ref)
        records[item["alias"]] = resolve_one(source_doc, item["relationship"])
    return records


def resolve_one(source_doc, relationship: str) -> dict:
    definition = _definition(source_doc.doctype_label, relationship)
    if definition["cardinality"] != "one":
        raise ValueError(f"Relationship {relationship} returns multiple records")
    value = getattr(source_doc, f"{definition['fieldname']}_id", None)
    if not value:
        raise ValueError(f"Relationship {relationship} did not resolve to one record")
    return {"doctype": definition["target_doctype"], "name": str(value)}


def query_related(source_doc, relationship: str, filters=None, limit=MAX_RELATED_ROWS) -> list[dict]:
    definition = _definition(source_doc.doctype_label, relationship)
    if definition["kind"] != "reverse_link":
        raise ValueError(f"Relationship {relationship} is not a many-record relationship")
    target_model = _model_for(definition["target_doctype"])
    qs = target_model.objects.filter(**{definition["fieldname"]: source_doc.pk}).filter(_filters_to_q(filters))
    qs = qs[: min(limit or MAX_RELATED_ROWS, MAX_RELATED_ROWS)]
    return [{"doctype": definition["target_doctype"], "name": str(row.pk)} for row in qs]


def _filters_to_q(filters):
    """`filters` is the same `[field, operator, value]` row shape as conditions.py's filter
    tree -- reused here for a related-record query's own narrowing filters."""
    from django.db.models import Q

    op_map = {"=": "exact", "!=": "exact", ">": "gt", ">=": "gte", "<": "lt", "<=": "lte", "like": "icontains"}
    negated = {"!="}
    q = Q()
    for row in filters or []:
        if not isinstance(row, (list, tuple)) or len(row) < 3:
            continue
        field, op, value = row[0], row[1], row[2]
        lookup = op_map.get(op, "exact")
        condition = Q(**{f"{field}__{lookup}": value})
        q &= ~condition if op in negated else condition
    return q


def load_record(reference, permission_type=None):
    """permission_type is accepted for call-site parity with upstream; this port's REST layer
    already gates every read/write through DRF's IsAuthenticated, so there is no separate
    per-document permission check to run here."""
    if not reference:
        raise ValueError("Record alias could not be resolved")
    model = _model_for(reference["doctype"])
    doc = model.objects.filter(pk=reference["name"]).first()
    if not doc:
        raise ValueError(f"Related record does not exist: {reference['doctype']} {reference['name']}")
    doc.doctype_label = reference["doctype"]
    return doc


def _model_for(doctype: str):
    from apps.crm.doctype_registry import get_doctype_model

    model = get_doctype_model(doctype)
    if model is None:
        raise ValueError(f"Unknown doctype: {doctype}")
    return model


def _definitions(source_doctype: str | None) -> list[dict]:
    if not source_doctype:
        return []
    model = _model_for(source_doctype)
    return [*_forward_links(source_doctype, model), *_reverse_links(source_doctype, model)]


def _forward_links(source_doctype, model) -> list[dict]:
    from apps.crm.doctype_registry import list_doctype_labels

    label_by_model = _label_by_model()
    for field in model._meta.get_fields():
        if not isinstance(field, ForeignKey) or field.model is not model:
            continue
        target_label = label_by_model.get(field.related_model)
        if not target_label:
            continue
        yield {
            "name": field.name,
            "label": field.verbose_name.title() if hasattr(field, "verbose_name") else field.name,
            "cardinality": "one",
            "target_doctype": target_label,
            "kind": "link",
            "fieldname": field.name,
        }


def _reverse_links(source_doctype, model) -> list[dict]:
    label_by_model = _label_by_model()
    for field in model._meta.get_fields():
        if not (field.is_relation and field.auto_created and not field.concrete):
            continue
        related_model = field.related_model
        target_label = label_by_model.get(related_model)
        if not target_label:
            continue
        fk_field = field.field  # the ForeignKey on the *other* model pointing back at `model`
        yield {
            "name": f"{fk_field.name}_via_{target_label.lower().replace(' ', '_')}",
            "label": f"{target_label} (by {fk_field.name})",
            "cardinality": "many",
            "target_doctype": target_label,
            "kind": "reverse_link",
            "fieldname": fk_field.name,
        }


_label_cache: dict | None = None


def _label_by_model() -> dict:
    global _label_cache
    if _label_cache is None:
        from apps.crm.doctype_registry import _registry

        _label_cache = {model: label for label, model in _registry().items()}
    return _label_cache


def _definition(source_doctype: str | None, relationship: str | None) -> dict:
    for definition in _definitions(source_doctype):
        if definition["name"] == relationship:
            return definition
    raise ValueError(f"Unknown automation relationship: {relationship}")


def _public(definition) -> dict:
    return {k: v for k, v in definition.items() if k not in ("kind", "fieldname")}


def _parse_relationships(relationships) -> list[dict]:
    if not relationships:
        return []
    import json

    parsed = json.loads(relationships) if isinstance(relationships, str) else relationships
    if not isinstance(parsed, list):
        raise ValueError("Relationships must be a JSON list")
    return [dict(item) for item in parsed]


def _validate_alias(item, aliases):
    if not item.get("alias") or not item.get("relationship"):
        raise ValueError("Each relationship needs an alias and relationship name")
    if item["alias"] in aliases:
        raise ValueError(f"Duplicate record alias: {item['alias']}")
    if (item.get("source") or "trigger") not in aliases:
        raise ValueError(f"Unknown relationship source alias: {item.get('source')}")


def _reference(doc) -> dict:
    return {"doctype": getattr(doc, "doctype_label", None), "name": str(doc.pk)}
