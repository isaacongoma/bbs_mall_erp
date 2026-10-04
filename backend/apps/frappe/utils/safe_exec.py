from __future__ import annotations

import ast
import inspect
import io
import mimetypes
import copy
import json
import types
from functools import lru_cache

import RestrictedPython.Guards
from RestrictedPython import compile_restricted, safe_globals

import frappe
import frappe.utils
import frappe.utils.data
from frappe import _
from frappe.utils.caching import site_cache
from frappe.utils.inplacevar import protected_inplacevar


def get_module_properties(module, filter_method):
    data = {}
    for key, obj in module.__dict__.items():
        if key.startswith("_"):
            continue

        if filter_method(obj):
            data[key] = obj
    return data




class ServerScriptNotEnabled(frappe.PermissionError):
    pass


ARGUMENT_NOT_SET = object()


SAFE_EXEC_CONFIG_KEY = "server_script_enabled"


SERVER_SCRIPT_FILE_PREFIX = "<serverscript>"


RENDER_EXEC_CONFIG_KEY = "disable_render_safe_exec"


class NamespaceDict(frappe._dict):
    """Raise AttributeError if function not found in namespace"""

    def __getattr__(self, key):
        ret = self.get(key)
        if (not ret and key.startswith("__")) or (key not in self):

            def default_function(*args, **kwargs):
                raise AttributeError(f"module has no attribute '{key}'")

            return default_function
        return ret


def is_safe_exec_enabled() -> bool:
    return bool(frappe.get_common_site_config(cached=True).get(SAFE_EXEC_CONFIG_KEY))


def is_render_exec_enabled() -> bool:
    return not bool(frappe.get_common_site_config(cached=True).get(RENDER_EXEC_CONFIG_KEY, 0))


@site_cache(maxsize=32)
def _compile_code(script: str, filename: str, mode: str = "exec"):
    return compile_restricted(script, filename=filename, policy=FrappeTransformer, mode=mode)


def safe_eval(code, eval_globals=None, eval_locals=None):
    import unicodedata

    code = unicodedata.normalize("NFKC", code)

    _validate_safe_eval_syntax(code)

    if not eval_globals:
        eval_globals = {}

    eval_globals["__builtins__"] = {}
    eval_globals.update(WHITELISTED_SAFE_EVAL_GLOBALS)

    assert eval_globals["__builtins__"] == {}, "safe_eval must run with empty __builtins__"

    return eval(_compile_code(code, filename="<safe_eval>", mode="eval"), eval_globals, eval_locals)


def _validate_safe_eval_syntax(code):
    BLOCKED_NODES = (ast.NamedExpr, ast.Lambda)

    tree = ast.parse(code, mode="eval")
    for node in ast.walk(tree):
        if isinstance(node, BLOCKED_NODES):
            raise SyntaxError(f"Operation not allowed: line {node.lineno} column {node.col_offset}")


@lru_cache
def _flatten(module):
    new_mod = NamespaceDict()
    for name, obj in inspect.getmembers(module, lambda x: not inspect.ismodule(x)):
        if not name.startswith("_"):
            new_mod[name] = obj
    return new_mod


def get_python_builtins():
    return {
        "abs": abs,
        "all": all,
        "any": any,
        "bool": bool,
        "dict": dict,
        "enumerate": enumerate,
        "isinstance": isinstance,
        "issubclass": issubclass,
        "list": list,
        "max": max,
        "min": min,
        "range": range,
        "set": set,
        "sorted": sorted,
        "sum": sum,
        "tuple": tuple,
    }


def _getitem(obj, key):
    if isinstance(key, str) and key.startswith("_"):
        raise SyntaxError("Key starts with _")
    return obj[key]


UNSAFE_ATTRIBUTES = {
    "gi_frame",
    "gi_code",
    "gi_yieldfrom",
    "cr_frame",
    "cr_code",
    "cr_origin",
    "cr_await",
    "ag_code",
    "ag_frame",
    "tb_frame",
    "tb_next",
    "format",
    "format_map",
    "f_back",
    "f_builtins",
    "f_code",
    "f_globals",
    "f_locals",
    "f_trace",
}


def _getattr_for_safe_exec(object, name, default=None):
    _validate_attribute_read(object, name)

    ret = RestrictedPython.Guards.safer_getattr(object, name, default=default)
    if isinstance(ret, types.ModuleType | types.CodeType | types.TracebackType | types.FrameType):
        raise SyntaxError(f"Reading {type(ret)} is not allowed")

    return ret


def _get_attr_for_eval(object, name, default=ARGUMENT_NOT_SET):
    _validate_attribute_read(object, name)

    return getattr(object, name) if default is ARGUMENT_NOT_SET else getattr(object, name, default)


def _validate_attribute_read(object, name):
    if isinstance(name, str) and (name in UNSAFE_ATTRIBUTES):
        raise SyntaxError(f"{name} is an unsafe attribute")

    if isinstance(object, types.ModuleType | types.CodeType | types.TracebackType | types.FrameType):
        raise SyntaxError(f"Reading {object} attributes is not allowed")

    if name.startswith("_"):
        raise AttributeError(f'"{name}" is an invalid attribute name because it starts with "_"')


def _write(obj):
    if isinstance(
        obj,
        types.ModuleType
        | types.CodeType
        | types.TracebackType
        | types.FrameType
        | type
        | types.FunctionType
        | types.MethodType
        | types.BuiltinFunctionType,
    ):
        raise SyntaxError(f"Not allowed to write to object {obj} of type {type(obj)}")
    return obj


VALID_UTILS = (
    "DATE_FORMAT",
    "TIME_FORMAT",
    "DATETIME_FORMAT",
    "is_invalid_date_string",
    "getdate",
    "get_datetime",
    "to_timedelta",
    "get_timedelta",
    "add_to_date",
    "add_days",
    "add_months",
    "add_years",
    "date_diff",
    "month_diff",
    "time_diff",
    "time_diff_in_seconds",
    "time_diff_in_hours",
    "now_datetime",
    "get_timestamp",
    "get_eta",
    "get_system_timezone",
    "convert_utc_to_system_timezone",
    "now",
    "nowdate",
    "today",
    "nowtime",
    "get_first_day",
    "get_quarter_start",
    "get_quarter_ending",
    "get_first_day_of_week",
    "get_year_start",
    "get_year_ending",
    "get_last_day_of_week",
    "get_last_day",
    "get_time",
    "get_datetime_in_timezone",
    "get_datetime_str",
    "get_date_str",
    "get_time_str",
    "get_user_date_format",
    "get_user_time_format",
    "format_date",
    "format_time",
    "format_datetime",
    "format_duration",
    "get_weekdays",
    "get_weekday",
    "get_timespan_date_range",
    "global_date_format",
    "has_common",
    "flt",
    "cint",
    "floor",
    "ceil",
    "cstr",
    "rounded",
    "remainder",
    "safe_div",
    "round_based_on_smallest_currency_fraction",
    "encode",
    "parse_val",
    "fmt_money",
    "get_number_format_info",
    "money_in_words",
    "in_words",
    "is_html",
    "is_image",
    "get_thumbnail_base64_for_image",
    "get_image_thumbnail_uri",
    "image_to_base64",
    "pdf_to_base64",
    "strip_html",
    "escape_html",
    "pretty_date",
    "comma_or",
    "comma_and",
    "comma_sep",
    "new_line_sep",
    "filter_strip_join",
    "add_trackers_to_url",
    "parse_and_map_trackers_from_url",
    "map_trackers",
    "get_url",
    "get_host_name_from_request",
    "url_contains_port",
    "get_host_name",
    "get_link_to_form",
    "get_link_to_report",
    "get_absolute_url",
    "get_url_to_form",
    "get_url_to_list",
    "get_url_to_report",
    "get_url_to_report_with_filters",
    "evaluate_filters",
    "compare",
    "get_filter",
    "make_filter_tuple",
    "make_filter_dict",
    "sanitize_column",
    "scrub_urls",
    "expand_relative_urls",
    "quoted",
    "quote_urls",
    "unique",
    "strip",
    "to_markdown",
    "md_to_html",
    "markdown",
    "is_subset",
    "generate_hash",
    "formatdate",
    "get_user_info_for_avatar",
    "get_abbr",
    "get_month",
    "sha256_hash",
    "parse_json",
    "orjson_dumps",
)


SAFE_DATA_UTILS = {key: frappe.utils.data.__dict__[key] for key in VALID_UTILS}


WHITELISTED_SAFE_EVAL_GLOBALS = {
    "int": int,
    "float": float,
    "long": int,
    "round": round,
    "_getattr_": _get_attr_for_eval,
    "_getitem_": _getitem,
    "_getiter_": iter,
    "_iter_unpack_sequence_": RestrictedPython.Guards.guarded_iter_unpack_sequence,
    "_inplacevar_": protected_inplacevar,
}


SAFE_EXCEPTIONS = get_module_properties(
    frappe.exceptions, lambda obj: inspect.isclass(obj) and issubclass(obj, Exception)
)


def safe_exec(script, _globals=None, _locals=None, *, restrict_commit_rollback=False, script_filename=None):
    exec_globals = dict(safe_globals)
    exec_globals.update(WHITELISTED_SAFE_EVAL_GLOBALS)
    exec_globals["frappe"] = frappe
    if _globals:
        exec_globals.update(_globals)
    byte_code = compile_restricted(script, filename=script_filename or "<serverscript>", mode="exec")
    exec(byte_code, exec_globals, _locals)
    return exec_globals, _locals


def get_safe_globals():
    return frappe._dict(json=json, frappe=frappe._dict(utils=frappe._dict(SAFE_DATA_UTILS)))


def safe_exec_flags():
    from contextlib import nullcontext

    return nullcontext()
