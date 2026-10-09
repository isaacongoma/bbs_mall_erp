__version__ = "17.0.0-dev"
from .runtime import _
from .runtime import _lt
from .runtime import N_
from .runtime import _dict
from .runtime import as_json
from .runtime import bold
from .runtime import cache
from .runtime import client_cache
from .runtime import db
from .runtime import flags
from .runtime import generate_hash
from .runtime import get_all
from .runtime import get_attr
from .runtime import get_cached_doc
from .runtime import get_lazy_doc
from .runtime import get_cached_value
from .runtime import get_desk_link
from .runtime import get_doc
from .runtime import get_hooks
from .runtime import get_last_doc
from .runtime import get_list
from .runtime import get_meta
from .runtime import get_module
from .runtime import get_system_settings
from .runtime import has_permission
from .runtime import is_whitelisted
from .runtime import local
from .runtime import call
from .runtime import set_value
from .runtime import get_value
from .runtime import reload_doctype
from .runtime import reload_doc
from .runtime import get_precision
from .runtime import set_user
from .runtime import only_for
from .runtime import logger
from .runtime import log_error
from .runtime import errprint
from .runtime import get_traceback
from .runtime import safe_encode
from .runtime import safe_decode
from .runtime import copy_doc
from .runtime import get_roles
from .runtime import local_cache
from .runtime import get_installed_apps
from .runtime import write_only
from .runtime import only_has_select_perm
from .runtime import are_emails_muted
from .runtime import get_single_value
import json
from .runtime import sendmail
from .runtime import read_only
from .runtime import is_setup_complete
from .runtime import request_cache
from .runtime import get_module_path
from .runtime import get_app_path
from .runtime import msgprint
from .runtime import new_doc
from .runtime import parse_json
from .runtime import render_template
from .runtime import scrub
from .runtime import unscrub
from .runtime import conf
from .runtime import get_request_header
from .runtime import session
from .runtime import throw
from .runtime import validate_and_sanitize_search_inputs
from .runtime import whitelist
from .runtime import whitelisted
from .runtime import xss_safe_methods
from .runtime import is_whitelisted
from .runtime import loggers
from .runtime import log_level
from .runtime import guest_methods
from .runtime import allowed_http_methods_for_whitelisted_func
from .runtime import init
from .runtime import connect
from .runtime import destroy
from .runtime import init_site
from .runtime import clear_cache
from .runtime import clear_last_message
from .runtime import delete_doc
from .runtime import delete_doc_if_exists
from .runtime import enqueue
from .runtime import form_dict
from .runtime import in_test
from .runtime import publish_realtime
from .runtime import rename_doc
from .exceptions import LinkExistsError
from .exceptions import QueryDeadlockError
from .exceptions import QueryTimeoutError
from .utils import cint
from .utils import cstr
from .utils import flt
from .utils.data import as_unicode

from . import exceptions
from .exceptions import DoesNotExistError
from .exceptions import DuplicateEntryError
from .exceptions import InvalidDates
from .exceptions import InvalidEmailAddressError
from .exceptions import InvalidNameError
from .exceptions import InvalidPhoneNumberError
from .exceptions import InvalidRoundingMethod
from .exceptions import LinkValidationError
from .exceptions import MandatoryError
from .exceptions import NameError
from .exceptions import PermissionError
from .exceptions import TimestampMismatchError
from .exceptions import ValidationError

from .utils.data import sbool


def __getattr__(name):
    if name == "qb":
        from apps.frappe.query_builder import builder as _builder

        import apps.frappe.query_builder as _qb_pkg

        return _builder.Postgres
    from apps.frappe import exceptions as _exceptions

    if hasattr(_exceptions, name):
        return getattr(_exceptions, name)
    lazy = {
        "get_single": ("apps.frappe.runtime", "get_single"),
        "format": ("apps.frappe.utils.formatters", "format_value"),
        "format_value": ("apps.frappe.utils.formatters", "format_value"),
        "safe_eval": ("apps.frappe.utils.safe_exec", "safe_eval"),
        "get_query": ("apps.frappe.query_builder.engine", "get_query"),
        "make_property_setter": ("apps.frappe.runtime", "make_property_setter"),
        "enqueue_doc": ("apps.frappe.utils.background_jobs", "enqueue_doc"),
        "read_file": ("apps.frappe.utils", "read_file"),
        "Document": ("apps.frappe.model.document", "Document"),
        "publish_progress": ("apps.frappe.runtime", "publish_progress"),
        "clear_messages": ("apps.frappe.runtime", "clear_messages"),
        "get_message_log": ("apps.frappe.runtime", "get_message_log"),
        "clear_document_cache": ("apps.frappe.runtime", "clear_document_cache"),
        "get_document_cache_key": ("apps.frappe.runtime", "get_document_cache_key"),
        "concurrent_limit": ("apps.frappe.concurrency_limiter", "concurrent_limit"),
        "get_website_settings": ("apps.frappe.runtime", "get_website_settings"),
        "get_active_domains": ("apps.frappe.runtime", "get_active_domains"),
        "attach_print": ("apps.frappe.runtime", "attach_print"),
        "enqueue_task": ("apps.frappe.utils.background_jobs", "enqueue"),
        "get_test_records": ("apps.frappe.deprecation_dumpster", "frappe_get_test_records"),
        "get_site_path": ("apps.frappe.utils", "get_site_path"),
        "get_doc_hooks": ("apps.frappe.runtime", "get_doc_hooks"),
        "throw_permission_error": ("apps.frappe.utils.messages", "throw_permission_error"),
        "toast": ("apps.frappe.utils.messages", "toast"),
        "log": ("apps.frappe.runtime", "log"),
        "get_domain_data": ("apps.frappe.runtime", "get_domain_data"),
        "is_table": ("apps.frappe.runtime", "is_table"),
        "get_meta_module": ("apps.frappe.runtime", "get_meta_module"),
        "append_hook": ("apps.frappe.runtime", "append_hook"),
        "_get_cached_signature_params": ("apps.frappe.runtime", "_get_cached_signature_params"),
        "get_newargs": ("apps.frappe.runtime", "get_newargs"),
        "redirect": ("apps.frappe.runtime", "redirect"),
        "get_doctype_app": ("apps.frappe.runtime", "get_doctype_app"),
        "ping": ("apps.frappe.runtime", "ping"),
        "override_whitelisted_method": ("apps.frappe.runtime", "override_whitelisted_method"),
        "get_disabled_apps": ("apps.frappe.apps", "get_disabled_apps"),
        "get_all_apps": ("apps.frappe.apps", "get_all_apps"),
        "get_active_apps": ("apps.frappe.apps", "get_active_apps"),
        "get_module_list": ("apps.frappe.modules.utils", "get_module_list"),
        "get_app_source_path": ("apps.frappe.modules.utils", "get_app_source_path"),
        "get_file_items": ("apps.frappe.utils", "get_file_items"),
        "get_file_json": ("apps.frappe.utils", "get_file_json"),
        "respond_as_web_page": ("apps.frappe.utils.response", "respond_as_web_page"),
        "redirect_to_message": ("apps.frappe.utils.response", "redirect_to_message"),
        "get_docs": ("apps.frappe.model.document", "get_docs"),
        "can_cache_doc": ("apps.frappe.model.document", "can_cache_doc"),
        "_set_document_in_cache": ("apps.frappe.model.document", "_set_document_in_cache"),
        "get_current_task": ("apps.frappe.utils.task_queue", "get_current_task"),
        "get_print": ("apps.frappe.utils.print_utils", "get_print"),
        "sendmail": ("apps.frappe.email", "sendmail"),
        "get_jenv": ("apps.frappe.utils.jinja", "get_jenv"),
        "get_jloader": ("apps.frappe.utils.jinja", "get_jloader"),
        "get_user": ("apps.frappe.runtime", "get_user"),
        "get_pymodule_path": ("apps.frappe.runtime", "get_pymodule_path"),
        "get_site_config": ("apps.frappe.runtime", "get_site_config"),
        "get_common_site_config": ("apps.frappe.config", "get_common_site_config"),
        "get_conf": ("apps.frappe.config", "get_conf"),
        "create_folder": ("apps.frappe.utils", "create_folder"),
        "set_user_lang": ("apps.frappe.utils.translations", "set_user_lang"),
        "get_template": ("apps.frappe.utils.jinja", "get_template"),
        "get_email_from_template": ("apps.frappe.utils.jinja", "get_email_from_template"),
        "reset_metadata_version": ("apps.frappe.cache_manager", "reset_metadata_version"),
    }
    if name in lazy:
        import importlib

        module_name, attr = lazy[name]
        return getattr(importlib.import_module(module_name), attr)
    if name == "debug_log":
        from apps.frappe.runtime import local as _local

        if not hasattr(_local, "debug_log"):
            _local.debug_log = []
        return _local.debug_log
    if name == "lang":
        from apps.frappe.runtime import local as _local

        return _local.lang
    if name == "_dev_server":
        return False
    if name == "io":
        import io as _io

        return _io
    if name == "response":
        from apps.frappe.runtime import local as _local

        return _local.response
    if name == "message_log":
        from apps.frappe.runtime import local as _local

        return _local.message_log
    if name == "request":
        from apps.frappe.runtime import local as _local

        return _local.request
    import importlib

    try:
        return importlib.import_module(f"apps.frappe.{name}")
    except ModuleNotFoundError as exc:
        if exc.name != f"apps.frappe.{name}":
            raise
    raise AttributeError(name)

STANDARD_USERS = ("Guest", "Administrator")

controllers = {}


def task(**task_kwargs):
    def decorator_task(f):
        f.enqueue = lambda **fun_kwargs: enqueue(f, **task_kwargs, **fun_kwargs)
        return f

    return decorator_task


def has_website_permission(doc=None, ptype="read", user=None, verbose=False, doctype=None):
    from .runtime import call, get_hooks
    from .runtime import session as _session

    if not user:
        user = _session.user

    if doc:
        if isinstance(doc, str):
            from .runtime import get_lazy_doc

            doc = get_lazy_doc(doctype, doc)

        doctype = doc.doctype

        if doc.flags.ignore_permissions:
            return True

        if hasattr(doc, "has_website_permission"):
            return doc.has_website_permission(ptype, user, verbose=verbose)

    hooks = (get_hooks("has_website_permission") or {}).get(doctype, [])
    if hooks:
        for method in hooks:
            result = call(method, doc=doc, ptype=ptype, user=user, verbose=verbose)
            if not result:
                return False

        return True

    return False


def setup_module_map(include_all_apps: bool = True) -> None:
    from apps.frappe.apps import get_all_apps
    from apps.frappe.modules.utils import get_module_list

    app_modules = {}
    for app in get_all_apps(with_internal_apps=True):
        app_modules.setdefault(app, [])
        for module in get_module_list(app):
            app_modules[app].append(scrub(module))
    local.app_modules = app_modules
    local.module_app = {module: app for app, modules in app_modules.items() for module in modules}
