from importlib import import_module

from apps.frappe.runtime import get_module_path, scrub, unscrub

__all__ = ["scrub", "unscrub", "get_module_path", "load_doctype_module", "scrub_dt_dn", "get_module_name"]


def get_module_name(doctype, module, prefix="", suffix="", app=None):
    from apps.frappe.modules.utils import get_module_name as _get_module_name

    return _get_module_name(doctype, module, prefix, suffix, app)


def scrub_dt_dn(dt, dn):
    return scrub(dt), scrub(dn)


def load_doctype_module(doctype, module=None, prefix="", suffix=""):
    from apps.erpnext.registry import _doctype_app, get_meta, module_name

    module_label = module or get_meta(doctype).get("module")
    app = _doctype_app.get(doctype, "erpnext")
    return import_module(
        f"apps.{app}.{module_name(module_label)}.doctype.{scrub(doctype)}.{prefix}{scrub(doctype)}{suffix}"
    )


def make_boilerplate(*args, **kwargs):
    from apps.frappe.modules.utils import make_boilerplate as _make_boilerplate

    return _make_boilerplate(*args, **kwargs)


def get_doctype_module(doctype):
    from apps.frappe.modules.utils import get_doctype_module as _get_doctype_module

    return _get_doctype_module(doctype)


def __getattr__(name):
    from apps.frappe.modules import utils as _utils

    if hasattr(_utils, name) and not name.startswith("__"):
        return getattr(_utils, name)
    raise AttributeError(name)
