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
        "get_website_settings": ("apps.frappe.runtime", "get_website_settings"),
        "get_active_domains": ("apps.frappe.runtime", "get_active_domains"),
        "attach_print": ("apps.frappe.runtime", "attach_print"),
        "enqueue_task": ("apps.frappe.utils.background_jobs", "enqueue"),
    }
    if name in lazy:
        import importlib

        module_name, attr = lazy[name]
        return getattr(importlib.import_module(module_name), attr)
    if name == "io":
        import io as _io

        return _io
    if name == "message_log":
        from apps.frappe.runtime import local as _local

        return _local.message_log
    if name == "request":
        from apps.frappe.runtime import local as _local

        return _local.request
    raise AttributeError(name)
