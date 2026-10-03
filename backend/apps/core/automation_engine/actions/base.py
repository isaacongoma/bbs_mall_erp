# Ported from frappe/automation_engine/actions/base.py (frappe/frappe, MIT).
from __future__ import annotations

import json
from typing import ClassVar

USER_CONTROL = "users"


def render_value(value, doc, context=None):
    """Render a `{{ }}` Jinja-ish template against the document; pass through non-templates.
    This port has no Jinja dependency installed, so templates are rendered with Python's own
    str.format against a flattened `doc`/`target`/`payload` mapping -- {{ doc.status }} style
    references are rewritten to {doc[status]} first."""
    if not isinstance(value, str) or "{{" not in value:
        return value
    return _render_template(value, render_context(doc, context))


def _render_template(template: str, ctx: dict) -> str:
    import re

    def _sub(match):
        expr = match.group(1).strip()
        parts = expr.split(".")
        value = ctx.get(parts[0])
        for part in parts[1:]:
            value = value.get(part) if isinstance(value, dict) else getattr(value, part, None)
        return "" if value is None else str(value)

    return re.sub(r"\{\{\s*(.*?)\s*\}\}", _sub, template)


def render_context(doc, context=None) -> dict:
    context = context or {}
    doc_dict = _as_dict(doc)
    return {
        "doc": doc_dict,
        "target": doc_dict,
        "trigger": _as_dict(context.get("trigger_doc")) or doc_dict,
        "payload": context.get("payload") or {},
        "context": context,
    }


def _as_dict(doc) -> dict:
    if doc is None:
        return {}
    if isinstance(doc, dict):
        return doc
    from apps.core.doctype.assignment_rule.assignment_rule_engine import doc_to_condition_dict

    return doc_to_condition_dict(doc)


class AutomationParamError(Exception):
    def __init__(self, message, fieldname=None):
        self.fieldname = fieldname
        super().__init__(message)


class StopAutomation(Exception):
    """Raised by an action to park the run; resumes after `resume_after` seconds."""

    def __init__(self, message="", resume_after: int = 60):
        self.resume_after = resume_after
        super().__init__(message)


class AutomationAction:
    action_type: str = ""
    label: str = ""
    description: str = ""
    applicable_doctypes: list | None = None
    requires_document: bool = True
    transactional: bool = True
    supported_trigger_types: list | None = None
    params_schema: ClassVar[list] = []
    output_schema: ClassVar[dict | None] = None

    def validate(self, params: dict, doctype: str | None):
        """Override to validate params against `doctype`; raise AutomationParamError."""

    def output_doctype(self, params: dict) -> str | None:
        return None

    def output_targets(self, params: dict, output_alias: str | None) -> dict:
        return {output_alias: self.output_doctype(params)} if output_alias else {}

    def execute(self, doc, params: dict, context: dict):
        raise NotImplementedError

    def as_dict(self) -> dict:
        return {
            "action_type": self.action_type,
            "label": self.label,
            "description": self.description,
            "applicable_doctypes": self.applicable_doctypes,
            "requires_document": self.requires_document,
            "transactional": self.transactional,
            "supported_trigger_types": self.supported_trigger_types,
            "params_schema": self.params_schema,
            "output_schema": self.output_schema,
        }


_registry_cache: dict | None = None


def get_action_registry() -> dict:
    global _registry_cache
    if _registry_cache is None:
        from apps.core.automation_engine.actions.core import CORE_ACTIONS

        _registry_cache = {cls.action_type: cls() for cls in CORE_ACTIONS}
    return _registry_cache


def get_action(action_type: str) -> AutomationAction:
    action = get_action_registry().get(action_type)
    if not action:
        raise AutomationParamError(f"Unknown automation action: {action_type}")
    return action


def parse_params(raw) -> dict:
    if isinstance(raw, dict):
        return raw
    if not raw:
        return {}
    return json.loads(raw)
