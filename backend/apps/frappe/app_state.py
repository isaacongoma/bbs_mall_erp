import frappe


def is_disabled_app_filtering_active() -> bool:
    return False


def clear_cache_after_maintenance():
    return None


def get_disabled_modules() -> set[str]:
    return set()


def get_disabled_doctypes() -> set[str]:
    return set()


def get_disabled_apps() -> set[str]:
    return set()


def is_module_disabled(module: str) -> bool:
    return False


def is_doctype_disabled(doctype: str) -> bool:
    return False


def is_app_disabled(app: str) -> bool:
    return False


def filter_out_disabled_doctypes(doctypes):
    return doctypes
