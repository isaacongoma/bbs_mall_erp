from frappe.utils.caching import site_cache
import frappe
import json
from contextlib import contextmanager
from functools import lru_cache

from apps.frappe import exceptions
from apps.frappe.runtime import _, _dict, bold, flags, local, session, throw
from apps.frappe.utils import data as data_utils

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

SAFE_DATA_UTIL_NAMES = (
    "DATE_FORMAT",
    "TIME_FORMAT",
    "DATETIME_FORMAT",
    "is_invalid_date_string",
    "getdate",
    "get_datetime",
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
    "format_date",
    "format_time",
    "format_datetime",
    "format_duration",
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
    "fmt_money",
    "money_in_words",
    "in_words",
    "strip_html",
    "escape_html",
    "pretty_date",
    "comma_or",
    "comma_and",
    "comma_sep",
    "new_line_sep",
    "filter_strip_join",
    "evaluate_filters",
    "formatdate",
    "get_abbr",
    "get_month",
    "sha256_hash",
)


def safe_data_utils():
    return _dict({name: getattr(data_utils, name) for name in SAFE_DATA_UTIL_NAMES if hasattr(data_utils, name)})


def render_safe_globals():
    datautils = safe_data_utils()
    user = getattr(session, "user", None) or "Guest"
    form_dict = getattr(local, "form_dict", None) or _dict()
    return {
        "json": _dict(loads=json.loads, dumps=json.dumps),
        "dict": dict,
        "_dict": _dict,
        "args": form_dict,
        "frappe": _dict(
            flags=_dict(),
            format_date=data_utils.global_date_format,
            form_dict=form_dict,
            bold=bold,
            utils=datautils,
            user=user,
            session=_dict(user=user),
        ),
    }






def guess_is_path(template):
    if "\n" not in template and "." in template:
        extn = template.rsplit(".")[-1]
        if extn in ("html", "css", "scss", "py", "md", "json", "js", "xml", "txt"):
            return True
    return False






@site_cache(ttl=10 * 60, maxsize=8)
def _get_jloader():
    from jinja2 import ChoiceLoader, PackageLoader, PrefixLoader

    import frappe

    apps = frappe.get_hooks("template_apps")
    if not apps:
        apps = list(reversed(frappe.get_active_apps(_ensure_on_bench=True)))

    if "frappe" not in apps:
        apps.append("frappe")

    jloader = ChoiceLoader(
        [PrefixLoader({app: PackageLoader(app, ".") for app in apps})]
        + [PackageLoader(app, ".") for app in apps]
    )

    return jloader




def get_jloader():
    jloader = _get_jloader()
    frappe.local.jloader = jloader
    return jloader


def get_jinja_hooks():
    """Return a tuple of (methods, filters) each containing a dict of method name and method definition pair."""
    import frappe

    if not getattr(frappe.local, "site", None):
        return (None, None)

    from inspect import getmembers, isfunction
    from types import FunctionType, ModuleType

    def get_obj_dict_from_paths(object_paths):
        out = {}
        for obj_path in object_paths:
            try:
                obj = frappe.get_module(obj_path)
            except ModuleNotFoundError:
                obj = frappe.get_attr(obj_path)

            if isinstance(obj, ModuleType):
                functions = getmembers(obj, isfunction)
                for function_name, function in functions:
                    if function.__module__ == obj.__name__:
                        out[function_name] = function
            elif isinstance(obj, FunctionType):
                function_name = obj.__name__
                out[function_name] = obj
        return out

    values = frappe.get_hooks("jinja")
    methods, filters = values.get("methods", []), values.get("filters", [])

    method_dict = get_obj_dict_from_paths(methods)
    filter_dict = get_obj_dict_from_paths(filters)

    return method_dict, filter_dict


def get_template(path):
    jenv = get_jenv()
    return jenv.get_template(path, globals=jenv.globals)


def get_email_from_template(name, args):
    from jinja2 import TemplateNotFound

    args = args or {}
    try:
        message = get_template("templates/emails/" + name + ".html").render(args)
    except TemplateNotFound as e:
        raise e

    try:
        text_content = get_template("templates/emails/" + name + ".txt").render(args)
    except TemplateNotFound:
        text_content = None

    return (message, text_content)


def set_filters(jenv):
    import frappe
    from frappe.utils import cint, cstr, flt

    jenv.filters.update(
        {
            "json": frappe.as_json,
            "len": len,
            "int": cint,
            "str": cstr,
            "flt": flt,
        }
    )


def get_jenv(*, restrict_globals=None):
    import frappe
    from frappe.utils.safe_exec import get_safe_globals, is_render_exec_enabled, render_safe_globals

    if restrict_globals is None:
        restrict_globals = is_render_exec_enabled()

    local_key = "jenv_restricted" if restrict_globals else "jenv_unrestricted"
    if jenv := getattr(frappe.local, local_key, None):
        return jenv

    default_jenv = _get_jenv()
    jenv = default_jenv.overlay()
    if not frappe._dev_server:
        jenv.cache = default_jenv.cache

    jenv.globals = default_jenv.globals.copy()
    jenv.filters = default_jenv.filters.copy()

    if restrict_globals:
        jenv.globals.update(render_safe_globals())
    else:
        jenv.globals.update(get_safe_globals())

    methods, filters = get_jinja_hooks()
    jenv.globals.update(methods or {})
    jenv.filters.update(filters or {})

    setattr(frappe.local, local_key, jenv)

    return jenv


@site_cache(ttl=10 * 60, maxsize=4)
def _get_jenv():

    from jinja2 import DebugUndefined
    from jinja2.sandbox import SandboxedEnvironment

    from frappe.utils.safe_exec import UNSAFE_ATTRIBUTES

    UNSAFE_ATTRIBUTES = UNSAFE_ATTRIBUTES - {"format", "format_map"}

    class FrappeSandboxedEnvironment(SandboxedEnvironment):
        def is_safe_attribute(self, obj, attr, *args, **kwargs):
            if attr in UNSAFE_ATTRIBUTES:
                return False

            return super().is_safe_attribute(obj, attr, *args, **kwargs)

    jenv = FrappeSandboxedEnvironment(loader=get_jloader(), undefined=DebugUndefined, cache_size=32)
    set_filters(jenv)

    return jenv


def validate_template(html, restrict_globals=None):
    """Throws exception if there is a syntax error in the Jinja Template"""
    from jinja2 import TemplateSyntaxError

    import frappe

    if not html:
        return
    jenv = get_jenv(restrict_globals=restrict_globals)
    try:
        jenv.from_string(html)
    except TemplateSyntaxError as e:
        frappe.throw(f"Syntax error in template as line {e.lineno}: {e.message}")


def render_template(template, context=None, is_path=None, safe_render=True, *, restrict_globals=None):
    """Render a template using Jinja

    :param template: path or HTML containing the jinja template
    :param context: dict of properties to pass to the template
    :param is_path: (optional) assert that the `template` parameter is a path
    :param safe_render: (optional) prevent server side scripting via jinja templating
    :param restrict_globals: (optional) restrict globals in template rendering to render only globals.
    """
    if not template:
        return ""

    from jinja2 import TemplateError
    from jinja2.sandbox import SandboxedEnvironment

    from frappe import _, get_traceback, throw

    if context is None:
        context = {}

    try:
        if is_path or guess_is_path(template):
            is_path = True
            compiled_template = get_template(template)
        else:
            jenv: SandboxedEnvironment = get_jenv(restrict_globals=restrict_globals)
            if safe_render and ".__" in template:
                throw(_("Illegal template"))
            compiled_template = jenv.from_string(template)
    except TemplateError:
        import html

        throw(
            title="Jinja Template Error",
            msg=f"<pre>{template}</pre><pre>{html.escape(get_traceback())}</pre>",
        )

    import time

    from frappe.utils.logger import get_logger

    logger = get_logger("render-template")
    try:
        start_time = time.monotonic()
        with safe_render_flags():
            return compiled_template.render(context)
    except Exception as e:
        import html

        throw(title="Context Error", msg=f"<pre>{html.escape(get_traceback())}</pre>", exc=e)
    finally:
        if is_path:
            logger.debug(f"Rendering time: {time.monotonic() - start_time:.6f} seconds ({template})")
        else:
            logger.debug(f"Rendering time: {time.monotonic() - start_time:.6f} seconds")


@contextmanager
def safe_render_flags():
    if frappe.flags.in_render_safe_exec is None:
        frappe.flags.in_render_safe_exec = 0

    frappe.flags.in_render_safe_exec += 1

    try:
        yield
    finally:
        frappe.flags.in_render_safe_exec -= 1
        assert frappe.flags.in_render_safe_exec >= 0, "in_render_safe_exec flag must never go negative"
