from __future__ import annotations

import base64
import random
import re
import string
import time
from django.db import transaction
from django.utils import timezone

import frappe
from frappe import _
from apps.frappe import exceptions

NAMING_SERIES_PATTERN = re.compile(r"^[\w\- \/.#{}]+$", re.UNICODE)
BRACED_PARAMS_PATTERN = re.compile(r"(\{[\w | #]+\})")

def make_autoname(key="", doctype="", doc=None, *, ignore_validate=False):
    if key == "hash":
        ts = int(time.time() * 10) % (32**4)
        ts_part = base64.b32hexencode(ts.to_bytes(length=5, byteorder="big")).decode()[-3:].lower()
        random_part = "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(7))
        return (ts_part + random_part)[:10]

    if "#" not in key:
        key += ".#####"

    if not ignore_validate:
        if "." not in key:
            raise exceptions.ValidationError(f"Invalid naming series {key}: dot (.) missing")
        if not NAMING_SERIES_PATTERN.match(key):
            raise exceptions.ValidationError(f"Special Characters except '-', '#', '.', '/', '{{' and '}}' not allowed in naming series {key}")
        if "#" in key and ".#" not in key:
            raise exceptions.ValidationError(f"Invalid naming series {key}: dot (.) missing before the numeric placeholders.")

    parts = key.split(".")
    return parse_naming_series(parts, doc=doc)

def parse_naming_series(parts, doc=None, number_generator=None):
    if isinstance(parts, str):
        parts = parts.split(".")
    
    if not number_generator:
        number_generator = getseries

    name = ""
    series_set = False
    today = timezone.now()
    
    for e in parts:
        if not e:
            continue
        
        part = ""
        if e.startswith("#"):
            if not series_set:
                digits = len(e)
                part = number_generator(name, digits)
                series_set = True
        elif e == "YY":
            part = today.strftime("%y")
        elif e == "MM":
            part = today.strftime("%m")
        elif e == "DD":
            part = today.strftime("%d")
        elif e == "YYYY":
            part = today.strftime("%Y")
        elif e == "JJJ":
            part = today.strftime("%j")
        elif doc and (e.startswith("{") or getattr(doc, e, None) is not None):
            e = e.replace("{", "").replace("}", "")
            part = getattr(doc, e, None)
        else:
            part = e
            
        if isinstance(part, str):
            name += part
        elif part is not None:
            name += str(part).strip()
            
    return name

def getseries(key, digits):
    from apps.frappe.models import Series
    with transaction.atomic():
        series, _created = Series.objects.select_for_update().get_or_create(name=key, defaults={"current": 0})
        series.current += 1
        series.save(update_fields=["current"])
        return f"{series.current:0{digits}d}"

def revert_series_if_last(key, name, doc=None):
    if ".#" in key:
        prefix, hashes = key.rsplit(".", 1)
        if "#" not in hashes:
            hash_match = re.search("#+", key)
            if not hash_match:
                return
            name = name.replace(hashes, "")
            prefix = prefix.replace(hash_match.group(), "")
    else:
        prefix = key

    if "." in prefix:
        boundary = len(parse_naming_series(prefix.split("."), doc=doc))
        count = int(name[boundary:])
        prefix = name[:boundary]
    else:
        count = int(name.replace(prefix, ""))
        
    from apps.frappe.models import Series
    with transaction.atomic():
        try:
            series = Series.objects.select_for_update().get(name=prefix)
            if series.current == count:
                series.current -= 1
                series.save(update_fields=["current"])
        except Series.DoesNotExist:
            pass

def _format_autoname(autoname, doc):
    has_series = False

    def get_param_value_for_match(match):
        nonlocal has_series
        param = match.group()
        if param.startswith("{#"):
            has_series = True
            return getseries(autoname, len(param) - 2)
        return parse_naming_series([param[1:-1]], doc=doc)

    name = BRACED_PARAMS_PATTERN.sub(get_param_value_for_match, autoname[7:])
    if not has_series:
        raise exceptions.ValidationError(f"Please specify a series in your autoname format {autoname}")
    return name

def set_new_name(doc) -> None:
    from apps.erpnext.registry import get_meta

    doc.run_method("before_naming")
    
    meta = get_meta(doc.doctype)
    autoname = meta.get("autoname") or meta.get("naming_rule") or ""
    
    if getattr(doc, "amended_from", None):
        _set_amended_name(doc)
        if doc.name:
            return

    if not doc.name:
        doc.run_method("autoname")
        
    if not doc.name and getattr(doc, "naming_series", None):
        doc.name = make_autoname(doc.naming_series + ".#####", "", doc)
        
    if not doc.name and autoname:
        _autoname = autoname.lower()
        if _autoname.startswith("field:"):
            fieldname = autoname.split(":", 1)[1]
            doc.name = getattr(doc, fieldname, None)
            if not doc.name:
                raise exceptions.MandatoryError(f"{fieldname} is required")
        elif _autoname.startswith("format:"):
            doc.name = _format_autoname(autoname, doc)
        elif _autoname == "hash":
            doc.name = make_autoname("hash")
        elif _autoname.startswith("naming_series:"):
            if not getattr(doc, "naming_series", None):
                options = []
                field = next((f for f in meta.get("fields", []) if f.get("fieldname") == "naming_series"), None)
                if field and field.get("options"):
                    options = [o for o in field.get("options").split("\n") if o]
                doc.naming_series = options[0] if options else ""
            if not doc.naming_series:
                raise exceptions.MandatoryError("Naming Series mandatory")
            doc.name = make_autoname(doc.naming_series + ".#####", "", doc)
        elif "#" in autoname:
            def get_param_value_for_match(match):
                param = match.group()
                return parse_naming_series([param[1:-1]], doc=doc)
            name_with_params = BRACED_PARAMS_PATTERN.sub(get_param_value_for_match, autoname)
            normalized_autoname = re.sub(r"(?<!\.)(-\.#+)", r".\1", name_with_params)
            doc.name = make_autoname(normalized_autoname, doc=doc)

    if not doc.name and meta.get("issingle"):
        doc.name = doc.doctype
        
    if not doc.name:
        doc.name = make_autoname("hash")

    doc.name = validate_name(doc.doctype, doc.name)

def is_autoincremented(doctype: str, meta=None) -> bool:
    if meta is None:
        from apps.frappe.runtime import get_meta

        meta = get_meta(doctype)
    return not meta.get("issingle") and meta.get("autoname") == "autoincrement"

def validate_name(doctype: str, name):
    import apps.frappe as frappe

    if not name:
        frappe.throw(frappe._("No Name Specified for {0}").format(doctype))
    if isinstance(name, int):
        if is_autoincremented(doctype):
            frappe.db.set_next_sequence_val(doctype, name, is_val_used=True)
            return name
        frappe.throw(
            frappe._("Invalid name type (integer) for varchar name column"),
            frappe.NameError,
        )
    if name.startswith("New " + doctype):
        frappe.throw(
            frappe._("There were some errors setting the name, please contact the administrator"),
            frappe.NameError,
        )
    name = name.strip()
    if not frappe.get_meta(doctype).get("issingle") and (doctype == name) and (name != "DocType"):
        frappe.throw(frappe._("Name of {0} cannot be {1}").format(doctype, name), frappe.NameError)
    special_characters = "<>"
    if re.findall(f"[{special_characters}]+", name):
        message = ", ".join(f"'{c}'" for c in special_characters)
        frappe.throw(
            frappe._("Name cannot contain special characters like {0}").format(message),
            frappe.NameError,
        )
    return name

def _set_amended_name(doc):
    am_id = 1
    am_prefix = doc.amended_from
    
    from apps.erpnext.registry import get_model
    model = get_model(doc.doctype)
    
    try:
        amended = model.objects.only("amended_from").get(pk=doc.amended_from)
        if getattr(amended, "amended_from", None):
            am_id = int(doc.amended_from.split("-")[-1]) + 1
            am_prefix = "-".join(doc.amended_from.split("-")[:-1])
    except Exception:
        pass
        
    doc.name = am_prefix + "-" + str(am_id)
    return doc.name


class InvalidNamingSeriesError(frappe.ValidationError):
    pass


class InvalidUUIDValue(frappe.ValidationError):
    pass


def has_custom_parser(e):
    """Return True if the naming series part has a custom parser."""
    return frappe.get_hooks("naming_series_variables", {}).get(e)


def determine_consecutive_week_number(datetime):
    """Determines the consecutive calendar week"""
    m = datetime.month
    w = datetime.strftime("%V")
    if m == 1 and int(w) >= 52:
        w = "00"
    elif m == 12 and int(w) <= 1:
        w = "53"
    return w


def get_default_naming_series(doctype: str) -> str | None:
    """get default value for `naming_series` property"""
    naming_series_options = frappe.get_meta(doctype).get_naming_series_options()

    for option in naming_series_options:
        if option:
            return option


def append_number_if_name_exists(doctype, value, fieldname="name", separator="-", filters=None):
    if not filters:
        filters = dict()
    filters.update({fieldname: value})
    exists = frappe.db.exists(doctype, filters)

    regex = f"^{re.escape(value)}{separator}\\d+$"

    if exists:
        last = frappe.db.sql(
            f"""SELECT `{fieldname}` FROM `tab{doctype}`
            WHERE `{fieldname}` {frappe.db.REGEX_CHARACTER} %s
            ORDER BY length({fieldname}) DESC,
            `{fieldname}` DESC LIMIT 1""",
            regex,
        )

        if last:
            count = str(cint(last[0][0].rsplit(separator, 1)[1]) + 1)
        else:
            count = "1"

        value = f"{value}{separator}{count}"

    return value


class NamingSeries:
    __slots__ = ("series",)

    def __init__(self, series: str):
        assert isinstance(series, str), "naming series key must be a string"
        self.series = series

        if "#" not in self.series:
            self.series += ".#####"

        assert "#" in self.series, "naming series must contain a number placeholder after normalization"

    def validate(self):
        if "." not in self.series:
            frappe.throw(
                _("Invalid naming series {}: dot (.) missing").format(frappe.bold(self.series)),
                exc=InvalidNamingSeriesError,
            )

        if not NAMING_SERIES_PATTERN.match(self.series):
            frappe.throw(
                _(
                    "Special Characters except '-', '#', '.', '/', '{{' and '}}' not allowed in naming series {0}"
                ).format(frappe.bold(self.series)),
                exc=InvalidNamingSeriesError,
            )

        if "#" in self.series and ".#" not in self.series:
            frappe.throw(
                _(
                    "Invalid naming series {}: dot (.) missing before the numeric placeholders. Kindly use a format like <b>ABCD.#####</b>."
                ).format(frappe.bold(self.series)),
                exc=InvalidNamingSeriesError,
            )

    def generate_next_name(self, doc: "Document", *, ignore_validate=False) -> str:
        if not ignore_validate:
            self.validate()

        parts = self.series.split(".")
        return parse_naming_series(parts, doc=doc)

    def get_prefix(self) -> str:
        """Naming series stores prefix to maintain a counter in DB. This prefix can be used to update counter or validations.

        e.g. `SINV-.YY.-.####` has prefix of `SINV-22-` in database for year 2022.
        """

        prefix = None

        def fake_counter_backend(partial_series, digits):
            nonlocal prefix
            prefix = partial_series
            return "#" * digits

        parse_naming_series(self.series, number_generator=fake_counter_backend)

        if prefix is None:
            frappe.throw(_("Invalid Naming Series: {}").format(self.series))

        return prefix

    def get_preview(self, doc=None) -> list[str]:
        """Generate preview of naming series without using DB counters"""
        generated_names = []
        for count in range(1, 4):

            def fake_counter(_prefix, digits):
                return str(count).zfill(digits)

            generated_names.append(parse_naming_series(self.series, doc=doc, number_generator=fake_counter))
        return generated_names

    def update_counter(self, new_count: int) -> None:
        """Warning: Incorrectly updating series can result in unusable transactions"""
        Series = frappe.qb.DocType("Series")
        prefix = self.get_prefix()

        if frappe.db.get_value("Series", prefix, "name", order_by="name") is None:
            frappe.qb.into(Series).insert(prefix, 0).columns("name", "current").run()

        (frappe.qb.update(Series).set(Series.current, cint(new_count)).where(Series.name == prefix)).run()

    def get_current_value(self) -> int:
        prefix = self.get_prefix()
        return cint(frappe.db.get_value("Series", prefix, "current", order_by="name", for_update=True))


def set_name_by_naming_series(doc):
    """Sets name by the `naming_series` property"""
    if not doc.naming_series:
        doc.naming_series = get_default_naming_series(doc.doctype)

    if not doc.naming_series:
        frappe.throw(frappe._("Naming Series mandatory"))

    doc.name = make_autoname(doc.naming_series + ".#####", "", doc)


def _get_timestamp_prefix():
    ts = int(time.time() * 10)
    ts = ts % (32**4)
    ts_part = base64.b32hexencode(ts.to_bytes(length=5, byteorder="big")).decode()[-3:].lower()

    request_part = (get_trace_id() or "")[-1:]

    assert len(ts_part) == 3, "timestamp part of hash prefix must be exactly 3 chars"
    return request_part + ts_part


def _generate_random_string(length=10):
    """Better version of frappe.generate_hash for naming.

    This uses entire base32 instead of base16 used by generate_hash. So it has twice as many
    characters and hence more likely to have shorter common prefixes. i.e. slighly faster comparisons and less conflicts.

    Why not base36?
    It's not in standard library else using all characters is probably better approach.
    Why not base64?
    MySQL is case-insensitive, we can't use both upper and lower case characters.
    """
    from secrets import token_bytes as get_random_bytes

    return base64.b32hexencode(get_random_bytes(length)).decode()[:length].lower()


def set_name_from_naming_options(autoname, doc):
    """
    Get a name based on the autoname field option
    """

    _autoname = autoname.lower()

    if _autoname.startswith("field:"):
        doc.name = _field_autoname(autoname, doc)

        if not doc.name:
            fieldname = autoname[6:]
            frappe.throw(_("{0} is required").format(doc.meta.get_translated_label(fieldname)))

    elif _autoname.startswith("naming_series:"):
        set_name_by_naming_series(doc)
    elif _autoname.startswith("prompt"):
        _prompt_autoname(autoname, doc)
    elif _autoname.startswith("format:"):
        doc.name = _format_autoname(autoname, doc)
    elif "#" in autoname:
        def get_param_value_for_match(match):
            param = match.group()
            return parse_naming_series([param[1:-1]], doc=doc)

        name_with_params = BRACED_PARAMS_PATTERN.sub(get_param_value_for_match, autoname)

        normalized_autoname = re.sub(r"(?<!\.)(-\.#+)", r".\1", name_with_params)

        doc.name = make_autoname(normalized_autoname, doc=doc)
