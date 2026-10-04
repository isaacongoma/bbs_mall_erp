import os
from pathlib import Path

import frappe
from frappe import _
from apps.frappe.runtime import get_module_path, scrub


def export_module_json(doc, is_standard: bool, module: str, *, create_init: bool | None = None):
    if not frappe.flags.in_import and is_standard and frappe.conf.developer_mode:
        raise NotImplementedError("Developer-mode export of standard documents is not supported")
    return None


def scrub_dt_dn(dt: str, dn: str) -> tuple[str, str]:
    return scrub(dt), scrub(dn)


def get_doc_path(module: str, doctype: str, name: str) -> str:
    module_path = Path(get_module_path(module))
    path = module_path / Path(*scrub_dt_dn(doctype, name))
    if not path.resolve().is_relative_to(module_path.resolve()):
        raise ValueError(_("Path {0} is not within module {1}").format(path, module))
    return path.resolve()


def get_module_app(module: str) -> str:
    from apps.frappe.runtime import local

    for app, modules in local.app_modules.items():
        if module in modules or scrub(module) in [scrub(m) for m in modules]:
            return app
    frappe.throw(_("Module {} not found").format(module), exc=frappe.DoesNotExistError)


def get_module_name(doctype: str, module: str, prefix: str = "", suffix: str = "", app: str | None = None):
    app = scrub(app or get_module_app(module))
    module = scrub(module)
    doctype = scrub(doctype)
    return f"{app}.{module}.doctype.{doctype}.{prefix}{doctype}{suffix}"
