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


@lru_cache(maxsize=2)
def _get_jenv(restrict_globals):
    from jinja2 import DebugUndefined
    from jinja2.sandbox import SandboxedEnvironment

    allowed_unsafe = UNSAFE_ATTRIBUTES - {"format", "format_map"}

    class FrappeSandboxedEnvironment(SandboxedEnvironment):
        def is_safe_attribute(self, obj, attr, *args, **kwargs):
            if attr in allowed_unsafe:
                return False
            return super().is_safe_attribute(obj, attr, *args, **kwargs)

    from jinja2 import FileSystemLoader

    from django.conf import settings

    roots = [str(settings.BASE_DIR / "apps" / "erpnext"), str(settings.BASE_DIR / "apps" / "frappe")]
    jenv = FrappeSandboxedEnvironment(loader=FileSystemLoader(roots), undefined=DebugUndefined, cache_size=32)
    jenv.globals.update(render_safe_globals())
    return jenv


def get_jenv(*, restrict_globals=None):
    jenv = _get_jenv(True if restrict_globals is None else bool(restrict_globals))
    jenv.globals.update(render_safe_globals())
    return jenv


def validate_template(html, restrict_globals=None):
    from jinja2 import TemplateSyntaxError

    if not html:
        return
    jenv = get_jenv(restrict_globals=restrict_globals)
    try:
        jenv.from_string(html)
    except TemplateSyntaxError as e:
        throw(f"Syntax error in template as line {e.lineno}: {e.message}")


def guess_is_path(template):
    if "\n" not in template and "." in template:
        extn = template.rsplit(".")[-1]
        if extn in ("html", "css", "scss", "py", "md", "json", "js", "xml", "txt"):
            return True
    return False


def render_template(template, context=None, is_path=None, safe_render=True, *, restrict_globals=None):
    if not template:
        return ""

    from jinja2 import TemplateError

    if context is None:
        context = {}

    jenv = get_jenv(restrict_globals=restrict_globals)
    try:
        if is_path or guess_is_path(template):
            compiled_template = jenv.get_template(template)
        else:
            if safe_render and ".__" in template:
                throw(_("Illegal template"))
            compiled_template = jenv.from_string(template)
    except TemplateError as e:
        throw(f"Jinja Template Error: {e}")

    with safe_render_flags():
        return compiled_template.render(context)


@contextmanager
def safe_render_flags():
    if flags.in_render_safe_exec is None:
        flags.in_render_safe_exec = 0
    flags.in_render_safe_exec += 1
    try:
        yield
    finally:
        flags.in_render_safe_exec -= 1
