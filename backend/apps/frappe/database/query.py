from __future__ import annotations
import datetime
import re
import warnings
from functools import lru_cache
from typing import TYPE_CHECKING, Any, Literal

from pypika.enums import Arithmetic
from pypika.queries import QueryBuilder, Table
from pypika.terms import AggregateFunction, ArithmeticExpression, Star, Term, ValueWrapper

import frappe
from frappe import _
from frappe.boot import get_additional_filters_from_hooks
from frappe.database.operator_map import NESTED_SET_OPERATORS, OPERATOR_MAP, func_is
from frappe.database.utils import (
    DefaultOrderBy,
    FilterValue,
    convert_to_value,
    get_doctype_name,
    get_doctype_sort_info,
    get_order_by_fields,
    is_non_text_field,
    is_order_by_in_select,
)
from frappe.model import CORE_DOCTYPES as PERMITTED_CORE_DOCTYPES
from frappe.model import OPTIONAL_FIELDS, get_permitted_fields, numeric_fieldtypes
from frappe.model.base_document import DOCTYPES_FOR_DOCTYPE
from frappe.model.document import Document
from frappe.query_builder import Criterion, Field, Order, functions
from frappe.query_builder.custom import Month, MonthName, Quarter, Year

CORE_DOCTYPES = DOCTYPES_FOR_DOCTYPE | frozenset(
    (
        "Custom Field",
        "Property Setter",
        "Module Def",
        "__Auth",
        "__global_search",
        "Singles",
        "Sessions",
        "Series",
    )
)


TABLES_WITHOUT_DOCTYPE = frozenset(("Singles", "Sessions", "Series"))

IS_SET_EMPTY_VALUES: dict[str, int | str | None] = {
    **dict.fromkeys((*numeric_fieldtypes, "Rating", "Duration"), 0),
    "Time": "00:00:00",
    "Date": None,
    "Datetime": None,
}
IFNULL_FALLBACK_VALUES = {**IS_SET_EMPTY_VALUES, "Date": "0001-01-01", "Datetime": "0001-01-01"}


class JSONColumnCast(functions.Cast):
    """Cast this engine adds to a postgres `json` column, as opposed to a caller-supplied Cast."""


def _cast_autoincrement_name(field: Field, doctype: str) -> Term:
    if frappe.db.db_type == "postgres" and frappe.get_meta(doctype).autoname == "autoincrement":
        return functions.Cast(field, "varchar")
    return field


def _apply_date_field_filter_conversion(value, operator: str, doctype: str, field):
    """Apply datetime to date conversion for Date fieldtype filters.

    This matches db_query behavior where datetime values are truncated to dates
    when filtering on Date fields, for all operators (not just 'between').

    Args:
        value: The filter value (can be datetime, tuple of datetimes, or other)
        operator: The operator being used (between, >, <, etc.)
        doctype: The doctype to get field metadata from
        field: The field name or pypika Field object

    Returns:
        The converted value with datetimes converted to dates if field is Date type
    """
    try:
        if "." in str(field):
            field = field.split(".")[-1]

        if doctype in CORE_DOCTYPES:
            meta = None
        else:
            meta = frappe.get_meta(doctype)

        if meta is None:
            return value

        df = meta.get_field(field)
        if df is None or df.fieldtype != "Date":
            return value

        if operator.lower() == "between" and isinstance(value, list | tuple) and len(value) == 2:
            from_val, to_val = value
            if isinstance(from_val, datetime.datetime):
                from_val = from_val.date()
            if isinstance(to_val, datetime.datetime):
                to_val = to_val.date()
            return (from_val, to_val)
        elif isinstance(value, datetime.datetime):
            return value.date()

    except (AttributeError, TypeError, KeyError):
        pass

    return value


def _apply_datetime_field_filter_conversion(between_values: tuple | list, doctype: str, field) -> tuple:
    """Apply date to datetime conversion for Datetime fields with 'between' operator.

    Args:
        between_values: Tuple/list of two values [from, to] for between filter
        doctype: DocType name
        field: Field name or pypika Field object

    Returns:
        Tuple with dates expanded to datetime ranges for Datetime fields
    """
    from frappe.utils.data import convert_type_for_between_filters

    field_name = field
    if "." in str(field):
        field_name = field.split(".")[-1]

    if doctype in CORE_DOCTYPES:
        df = None
    else:
        meta = frappe.get_meta(doctype)
        df = meta.get_field(field_name) if meta else None

    if not (field_name in ("creation", "modified") or (df and df.fieldtype == "Datetime")):
        return between_values

    from_val, to_val = between_values

    from_val = convert_type_for_between_filters(from_val, set_time=datetime.time())
    to_val = convert_type_for_between_filters(to_val, set_time=datetime.time(23, 59, 59, 999999))

    return (from_val, to_val)


TAB_PATTERN = re.compile("^tab")
WORDS_PATTERN = re.compile(r"\w+")
COMMA_PATTERN = re.compile(r",\s*(?![^()]*\))")

SIMPLE_FIELD_PATTERN = re.compile(r"^\w+$")

FUNCTION_CALL_PATTERN = re.compile(r"^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\(", flags=re.ASCII)


ALLOWED_FIELD_PATTERN = re.compile(
    r"^(?:(`[\w\s-]+`|\w+)\.)?(`\w+`|\w+)(?:\s+as\s+(?:`[\w\s-]+`|'[\w\s:-]+'|\w+))?$",
    flags=re.IGNORECASE,
)

FIELD_PARSE_REGEX = re.compile(r"^(?:(`?)(tab[\w\s-]+)\1\.)?(`?)(\w+)\3$")

BACKTICK_FIELD_PARSE_REGEX = re.compile(r"^`tab([\w\s-]+)`\.(`?)(\w+)\2$")

CHILD_TABLE_FIELD_PATTERN = re.compile(r'^[`"]?tab([\w\s]+)[`"]?\.([`"]?)(\w+)\2$')

MAX_LIMIT = 18446744073709551615

FUNCTION_MAPPING = {
    "COUNT": functions.Count,
    "SUM": functions.Sum,
    "AVG": functions.Avg,
    "MAX": functions.Max,
    "MIN": functions.Min,
    "ABS": functions.Abs,
    "EXTRACT": functions.Extract,
    "LOCATE": functions.Locate,
    "TIMESTAMP": functions.Timestamp,
    "IFNULL": functions.IfNull,
    "CONCAT": functions.Concat,
    "NOW": functions.Now,
    "NULLIF": functions.NullIf,
    "MONTHNAME": MonthName,
    "QUARTER": Quarter,
    "MONTH": Month,
    "YEAR": Year,
}

STAR_ALLOWED_FUNCTIONS = frozenset(("COUNT",))

OPERATOR_MAPPING = {
    "ADD": Arithmetic.add,
    "SUB": Arithmetic.sub,
    "MUL": Arithmetic.mul,
    "DIV": Arithmetic.div,
}


class Engine:
    def _sync_model_columns(self):
        from apps.erpnext.registry import get_model

        try:
            get_model(self.doctype)
        except LookupError:
            pass

    def get_query(
        self,
        table: str | Table,
        fields: str | list | tuple | set | None = None,
        filters: dict[str, FilterValue] | FilterValue | list[list | FilterValue] | None = None,
        order_by: str | None = None,
        group_by: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
        distinct: bool = False,
        for_update: bool = False,
        update: bool = False,
        into: bool = False,
        delete: bool = False,
        *,
        validate_filters: bool = False,
        skip_locked: bool = False,
        wait: bool = True,
        ignore_permissions: bool = True,
        ignore_user_permissions: bool = False,
        user: str | None = None,
        parent_doctype: str | None = None,
        reference_doctype: str | None = None,
        or_filters: dict[str, FilterValue] | FilterValue | list[list | FilterValue] | None = None,
        db_query_compat: bool = False,
    ) -> QueryBuilder:
        """Build a query with optional compatibility mode for legacy db_query behavior.

        Args:
            db_query_compat: When True, uses legacy db_query behavior for sorting and filtering.
            This is kept optional to not break existing code that relies on the original query builder behaviour.
            ignore_user_permissions: Ignore user permissions for the query.
                Useful for link search queries when the link field has `ignore_user_permissions` set.
            validate_filters: DEPRECATED. Will be removed in future versions.
        """

        qb = frappe.local.qb
        db_type = frappe.local.db.db_type

        self.is_mariadb = db_type == "mariadb"
        self.is_postgres = db_type == "postgres"
        self.is_sqlite = db_type == "sqlite"
        self.user = user or frappe.session.user
        self.parent_doctype = parent_doctype
        self.reference_doctype = reference_doctype
        self.apply_permissions = not ignore_permissions
        self.ignore_user_permissions = ignore_user_permissions
        self.field_aliases = set()
        self.db_query_compat = db_query_compat
        self.permitted_fields_cache = {}
        self.is_aggregate_query = False
        self._grouped_queries = set()
        self._joined_link_tables = []
        self.link_table_aliases = {}
        self.link_table_counts = {}

        assert db_type in ("mariadb", "postgres", "sqlite"), f"unexpected db_type: {db_type}"

        if isinstance(table, Table):
            self.table = table
            self.doctype = get_doctype_name(table.get_sql())
        else:
            self.doctype = table
            self.table = qb.DocType(table)

        assert isinstance(self.doctype, str) and self.doctype, "doctype must be a non-empty string"

        self._sync_model_columns()

        if frappe.flags.get("ignore_user_permissions_for_doctype") == self.doctype:
            self.ignore_user_permissions = True

        if self.apply_permissions:
            self.check_select_permission()
            self.permission_doctype = parent_doctype or self.doctype
            self.permission_table = (
                qb.DocType(self.permission_doctype) if self.permission_doctype != self.doctype else self.table
            )

        is_select = False
        if update:
            self.query = qb.update(self.table, immutable=False)
        elif into:
            self.query = qb.into(self.table, immutable=False)
        elif delete:
            self.query = qb.from_(self.table, immutable=False).delete()
        else:
            self.query = qb.from_(self.table, immutable=False)
            self.apply_fields(fields, cast_json_columns=self.is_postgres and bool(distinct or group_by))
            is_select = True

        self.apply_filters(filters)
        self.apply_or_filters(or_filters)

        if limit:
            if not isinstance(limit, int) or limit < 0:
                frappe.throw(_("Limit must be a non-negative integer"), TypeError)
            self.query = self.query.limit(limit)

        if offset:
            if not isinstance(offset, int) or offset < 0:
                frappe.throw(_("Offset must be a non-negative integer"), TypeError)

            if not self.is_postgres and not limit:
                self.query = self.query.limit(MAX_LIMIT)

            self.query = self.query.offset(offset)

        if distinct:
            self.query = self.query.distinct()

        if for_update:
            self.query = self.query.for_update(skip_locked=skip_locked, nowait=not wait)

        if any(getattr(f, "is_aggregate", False) for f in getattr(self, "fields", [])):
            self.is_aggregate_query = True

        if group_by:
            self.is_aggregate_query = True
            self.apply_group_by(group_by)

        if order_by:
            if not (
                self.is_postgres
                and is_select
                and distinct
                and not self._can_apply_distinct_order_by(order_by)
            ):
                self.apply_order_by(order_by)
            else:
                warnings.warn(
                    (
                        "ORDER BY fields have been ignored because PostgreSQL requires them to "
                        "appear in the SELECT list when using with DISTINCT"
                    ),
                    UserWarning,
                    stacklevel=2,
                )

        self.add_permission_conditions()

        if self.apply_permissions:
            self.query._doctype = self.doctype
            self.query._parent_doctype = self.parent_doctype
            self.query._fields_list = getattr(self, "fields", [])

        if getattr(self.query, "_name_field_injected", False) and (distinct or self.is_aggregate_query):
            frappe.throw(
                _("Child table fields need 'name' in `fields` when using distinct or aggregate queries."),
                exc=frappe.ValidationError,
            )

        self.query.immutable = True
        return self.query

    def apply_fields(self, fields, cast_json_columns: bool = False):
        self.fields = self.parse_fields(fields)

        if self.apply_permissions:
            self.fields = self.apply_field_permissions()

        for field in self.fields:
            if alias := getattr(field, "alias", None):
                self.field_aliases.add(alias)

        if not self.fields:
            self.fields = [self.table.name]

        if cast_json_columns:
            self.fields = self._cast_json_select_fields(self.fields)

        self.query._child_queries = []
        self.query._name_field_injected = False
        has_select_field = False
        has_child_queries = False
        has_name_field = False

        for field in self.fields:
            if isinstance(field, DynamicTableField):
                self.query = field.apply_select(self.query, engine=self, cast_json=cast_json_columns)
                has_select_field = True
            elif isinstance(field, ChildQuery):
                self.query._child_queries.append(field)
                has_child_queries = True
            else:
                self.query = self.query.select(field)
                has_select_field = True
                is_source_name = getattr(field, "name", None) == "name"
                alias = getattr(field, "alias", None)

                if isinstance(field, Star) or (is_source_name and alias in (None, "name")):
                    has_name_field = True

        if not has_select_field:
            self.query = self.query.select(self.table.name)
            has_name_field = True

        if has_child_queries and not has_name_field:
            self.query = self.query.select(self.table.name)
            self.query._name_field_injected = True

    def apply_filters(
        self,
        filters: dict[str, FilterValue] | FilterValue | list[list | FilterValue] | None = None,
        collect: list | None = None,
    ):
        if filters is None:
            return

        if isinstance(filters, FilterValue):
            filters = {"name": convert_to_value(filters)}

        if isinstance(filters, Criterion):
            self.query = self.query.where(filters)
            return

        if isinstance(filters, dict):
            self.apply_dict_filters(filters, collect=collect)
            return

        if isinstance(filters, list | tuple):
            if not filters:
                return

            if len(filters) in (3, 4) and isinstance(filters[1], str):
                if (
                    filters[1].lower() in OPERATOR_MAP
                    or filters[1].lower() in get_additional_filters_from_hooks()
                ):
                    self.apply_list_filters(filters, collect=collect)
                    return

            if all(isinstance(d, FilterValue) for d in filters):
                self.apply_dict_filters(
                    {"name": ("in", tuple(convert_to_value(f) for f in filters))}, collect=collect
                )
                return

            is_nested_structure = False
            potential_nested_list = filters
            is_single_group = False

            if len(filters) == 1 and isinstance(filters[0], list | tuple):
                inner_list = filters[0]
                if (
                    len(inner_list) >= 3
                    and isinstance(inner_list[1], str)
                    and inner_list[1].lower() in ("and", "or")
                ):
                    is_nested_structure = True
                    potential_nested_list = inner_list
                    is_single_group = True

            elif (
                len(filters) >= 2
                and isinstance(filters[0], list | tuple)
                and any(isinstance(item, str) for i, item in enumerate(filters) if i % 2 != 0)
            ) or (len(filters) > 0 and isinstance(filters[0], str)):
                is_nested_structure = True

            if is_nested_structure:
                try:
                    if is_single_group:
                        combined_criterion = self._condition_to_criterion(potential_nested_list)
                    else:
                        combined_criterion = self._parse_nested_filters(potential_nested_list)
                    if combined_criterion:
                        if collect is not None:
                            collect.append(combined_criterion)
                        else:
                            self.query = self.query.where(combined_criterion)
                except Exception as e:
                    frappe.throw(_("Error parsing nested filters: {0}. {1}").format(filters, str(e)), exc=e)

            else:
                for filter_item in filters:
                    if isinstance(filter_item, list | tuple):
                        self.apply_list_filters(
                            filter_item, collect=collect
                        )
                    elif isinstance(filter_item, dict | Criterion):
                        self.apply_filters(filter_item, collect=collect)
                    else:
                        raise ValueError(
                            f"Invalid item type in filter list: {type(filter_item).__name__}. Expected list, tuple, dict, or Criterion."
                        )
            return

        raise ValueError(f"Unsupported filters type: {type(filters).__name__}")

    def apply_or_filters(
        self,
        or_filters: dict[str, FilterValue] | FilterValue | list[list | FilterValue] | None = None,
    ):
        """Apply OR filters - all conditions are combined with OR operator.

        Example:
            or_filters={"name": "User", "module": "Core"}
            → Collects: [Criterion(name='User'), Criterion(module='Core')]
            → Combines: Criterion(name='User') | Criterion(module='Core')
            → Result: WHERE name='User' OR module='Core'
        """
        if or_filters is None:
            return

        criteria = []
        self.apply_filters(or_filters, collect=criteria)

        if criteria:
            from functools import reduce

            combined = reduce(lambda a, b: a | b, criteria)
            self.query = self.query.where(combined)

    def apply_list_filters(self, filter: list, collect: list | None = None):
        match filter:
            case [field, value]:
                self._apply_filter(field, value, collect=collect)
            case [field, operator, value]:
                self._apply_filter(field, value, operator, collect=collect)
            case [doctype, field, operator, value]:
                self._apply_filter(field, value, operator, doctype, collect=collect)
            case [doctype, field, operator, value, _]:
                self._apply_filter(field, value, operator, doctype, collect=collect)
            case _:
                raise ValueError(f"Unknown filter format: {filter}")

    def apply_dict_filters(self, filters: dict[str, FilterValue | list], collect: list | None = None):
        for field, value in filters.items():
            operator = "="
            if isinstance(value, list | tuple):
                operator, value = value

            self._apply_filter(field, value, operator, collect=collect)

    def _apply_filter(
        self,
        field: str | Field,
        value: FilterValue | list | set | None,
        operator: str = "=",
        doctype: str | None = None,
        collect: list | None = None,
    ):
        """Applies a simple filter condition to the query."""
        criterion = self._build_criterion_for_simple_filter(field, value, operator, doctype)
        if criterion:
            if collect is not None:
                collect.append(criterion)
            else:
                self.query = self.query.where(criterion)

    def _build_criterion_for_simple_filter(
        self,
        field: str | Field,
        value: FilterValue | Field | list | set | None,
        operator: str = "=",
        doctype: str | None = None,
    ) -> "Criterion | None":
        """Builds a pypika Criterion object for a simple filter condition."""
        import operator as builtin_operator

        """Check hooks for custom_operator definitions"""
        additional_filters_config = get_additional_filters_from_hooks()
        if operator.lower() in additional_filters_config:
            f = frappe._dict(doctype=doctype or self.doctype, fieldname=field, operator=operator, value=value)
            from frappe.model.db_query import get_additional_filter_field

            resolved = get_additional_filter_field(additional_filters_config, f, value)
            operator = resolved.get("operator")
            value = resolved.get("value", value)

        _field = self._validate_and_prepare_filter_field(field, doctype)

        filter_doctype = self._get_field_doctype(_field, doctype or self.doctype)
        filter_field_name = (
            field if isinstance(field, str) else (_field.name if hasattr(_field, "name") else str(_field))
        ).split(".")[-1]
        comparison_field = self._cast_json_column(_field, filter_doctype)
        is_json_column = comparison_field is not _field

        if isinstance(value, Field):
            _value = value
        else:
            _value = convert_to_value(value)

        if isinstance(value, Document):
            frappe.throw(_("Document cannot be used as a filter value"))
        _operator = operator

        if isinstance(field, str) and field in ("_assign", "_liked_by") and _operator in ("=", "!="):
            _operator = "like" if _operator == "=" else "not like"
            if isinstance(_value, str) and _value:
                _value = f"%{_value}%"

        if _operator.lower() in ("timespan", "previous", "next"):
            from frappe.model.db_query import get_date_range

            _value = get_date_range(_operator.lower(), _value)
            _operator = "between"

        if isinstance(_value, datetime.datetime) or (
            isinstance(_value, list | tuple) and any(isinstance(v, datetime.datetime) for v in _value)
        ):
            _value = _apply_date_field_filter_conversion(_value, _operator, doctype or self.doctype, field)

        if _operator.lower() == "between":
            if isinstance(_value, list | tuple) and len(_value) == 2:
                _value = _apply_datetime_field_filter_conversion(_value, doctype or self.doctype, field)
            elif isinstance(_value, str):
                from frappe.model.db_query import get_between_date_filter

                target_meta = frappe.get_meta(doctype or self.doctype)
                df = target_meta.get_field(field)
                _value = tuple(
                    v.strip().strip("'") for v in get_between_date_filter(_value, df).split(" AND ")
                )

        if _operator.lower() in ("in", "not in"):
            if isinstance(_value, (list, tuple, set)) and len(_value) == 0:
                if _operator.lower() == "in":
                    return RawCriterion("1=0")
                else:
                    return RawCriterion("1=1")

        if not _value and isinstance(_value, list | tuple | set):
            _value = ("",)

        if self.db_query_compat and _value is None and _operator.casefold() in ("in", "not in"):
            _value = ("",)

        if _operator.casefold() in NESTED_SET_OPERATORS:
            hierarchy = _operator.casefold()
            docname = _value

            original_field_name = field if isinstance(field, str) else _field.name
            lookup_doctype = doctype or self.doctype
            lookup_meta = frappe.get_meta(lookup_doctype)
            if lookup_meta.has_field(original_field_name):
                _df = lookup_meta.get_field(original_field_name)
                ref_doctype = _df.options if _df else lookup_doctype
            else:
                ref_doctype = lookup_doctype

            nodes = get_nested_set_hierarchy_result(ref_doctype, docname, hierarchy)
            operator_fn = (
                OPERATOR_MAP["not in"]
                if hierarchy in ("not ancestors of", "not descendants of")
                else OPERATOR_MAP["in"]
            )
            return operator_fn(_field, nodes or ("",))

        if _operator.casefold() == "is" and isinstance(_field, Field):
            return func_is(
                comparison_field, _value, self._get_is_set_empty_value(filter_doctype, filter_field_name)
            )

        if (
            self.is_postgres and _operator.casefold() == "like"
        ):
            operator_fn = OPERATOR_MAP["ilike"]
        else:
            operator_fn = OPERATOR_MAP[_operator.casefold()]
        if _value is None and isinstance(_field, Field):
            if operator_fn == builtin_operator.ne:
                fallback_value = self._get_ifnull_fallback(filter_doctype, filter_field_name)
                return operator_fn(comparison_field, ValueWrapper(fallback_value))
            else:
                return _field.isnull()
        else:
            target_doctype = filter_doctype

            if not isinstance(_field, functions.IfNull | functions.Coalesce) and self._should_apply_ifnull(
                target_doctype, filter_field_name, _operator, _value
            ):
                fallback_value = self._get_ifnull_fallback(target_doctype, filter_field_name)
                if fallback_value == _value:
                    if _operator == "=":
                        return _field.isnull() | comparison_field.eq(_value)
                    elif _operator == "!=":
                        return operator_fn(comparison_field, _value)

                comparison_field = functions.IfNull(comparison_field, ValueWrapper(fallback_value))

            if (
                self.is_postgres
                and not is_json_column
                and _operator.casefold() in ("like", "not like", "ilike")
                and is_non_text_field(target_doctype, filter_field_name)
            ):
                comparison_field = functions.Cast(comparison_field, "varchar")

            if _operator.casefold() == "not in" and isinstance(_value, list | tuple | set) and None in _value:
                fallback_value = self._get_ifnull_fallback(target_doctype, filter_field_name)
                _value = tuple(fallback_value if v is None else v for v in _value)

            return operator_fn(comparison_field, _value)

    def _parse_nested_filters(self, nested_list: list | tuple) -> "Criterion | None":
        """Parses a nested filter list like [cond1, 'and', cond2, 'or', cond3, ...] into a pypika Criterion."""
        if not isinstance(nested_list, list | tuple):
            frappe.throw(_("Nested filters must be provided as a list or tuple."))

        if not nested_list:
            return None

        if not isinstance(nested_list[0], list | tuple):
            frappe.throw(
                _("Invalid start for filter condition: {0}. Expected a list or tuple.").format(nested_list[0])
            )

        current_criterion = self._condition_to_criterion(nested_list[0])

        idx = 1
        while idx < len(nested_list):
            operator_str = nested_list[idx]
            if not isinstance(operator_str, str) or operator_str.lower() not in ("and", "or"):
                frappe.throw(
                    _("Expected 'and' or 'or' operator, found: {0}").format(operator_str),
                    frappe.ValidationError,
                )

            idx += 1
            if idx >= len(nested_list):
                frappe.throw(_("Filter condition missing after operator: {0}").format(operator_str))

            next_condition = nested_list[idx]
            if not isinstance(next_condition, list | tuple):
                frappe.throw(
                    _("Invalid filter condition: {0}. Expected a list or tuple.").format(next_condition)
                )

            next_criterion = self._condition_to_criterion(next_condition)

            if operator_str.lower() == "and":
                current_criterion = current_criterion & next_criterion
            elif operator_str.lower() == "or":
                current_criterion = current_criterion | next_criterion

            idx += 1

        return current_criterion

    def _condition_to_criterion(self, condition: list | tuple) -> "Criterion":
        """Converts a single condition (simple filter list or nested list) into a pypika Criterion."""
        if not isinstance(condition, list | tuple):
            frappe.throw(_("Invalid condition type in nested filters: {0}").format(type(condition)))

        is_nested = False
        if len(condition) >= 2 and isinstance(condition[1], str) and isinstance(condition[0], list | tuple):
            is_nested = True

        if is_nested:
            return self._parse_nested_filters(condition)
        else:
            field, value, operator, doctype = None, None, None, None
            additional_filters_config = get_additional_filters_from_hooks()
            if (
                len(condition) == 3
                and isinstance(condition[1], str)
                and (
                    condition[1].lower() in OPERATOR_MAP or condition[1].lower() in additional_filters_config
                )
            ):
                field, operator, value = condition
            elif (
                len(condition) == 4
                and isinstance(condition[2], str)
                and (
                    condition[2].lower() in OPERATOR_MAP or condition[2].lower() in additional_filters_config
                )
            ):
                doctype, field, operator, value = condition
            elif len(condition) == 2:
                field, value = condition
                operator = "="
            else:
                frappe.throw(_("Invalid simple filter format: {0}").format(condition))

            return self._build_criterion_for_simple_filter(field, value, operator, doctype)

    def _validate_and_prepare_filter_field(self, field: str | Field, doctype: str | None = None) -> Field:
        """Validate field name for filters and return a pypika Field object. Handles dynamic fields."""

        if isinstance(field, Term):
            return field

        if "`" in field:
            if parsed := self._parse_backtick_field_notation(field):
                table_name, field_name = parsed

                self.check_filter_field_permission(table_name, field_name)

                return frappe.qb.DocType(table_name)[field_name]

            frappe.throw(
                _("Filter fields have invalid backtick notation: {0}").format(field),
                frappe.ValidationError,
                title=_("Invalid Filter"),
            )

        if "." in field:
            dynamic_field = DynamicTableField.parse(field, self.doctype, allow_tab_notation=False)
            if dynamic_field:
                target_doctype = dynamic_field.doctype
                target_fieldname = dynamic_field.fieldname
                parent_doctype_for_perm = (
                    dynamic_field.parent_doctype if isinstance(dynamic_field, ChildTableField) else None
                )
                self.check_filter_field_permission(target_doctype, target_fieldname, parent_doctype_for_perm)

                self.query = dynamic_field.apply_join(self.query, engine=self)
                return dynamic_field.field
            else:
                frappe.throw(
                    _(
                        "Invalid filter field format: {0}. Use 'fieldname' or 'link_fieldname.target_fieldname'."
                    ).format(field),
                    frappe.ValidationError,
                    title=_("Invalid Filter"),
                )
        else:
            if not SIMPLE_FIELD_PATTERN.match(field):
                frappe.throw(
                    _(
                        "Invalid characters in fieldname: {0}. Only letters, numbers, and underscores are allowed."
                    ).format(field),
                    frappe.ValidationError,
                    title=_("Invalid Filter"),
                )
            target_doctype = doctype or self.doctype
            target_fieldname = field
            parent_doctype_for_perm = self.parent_doctype if doctype else None

            if doctype and doctype != self.doctype:
                parent_meta = frappe.get_meta(self.doctype)
                parent_fieldname = None
                for df in parent_meta.get_table_fields():
                    if df.options == doctype:
                        parent_fieldname = df.fieldname
                        break

                if not parent_fieldname:
                    self.check_filter_field_permission(
                        target_doctype, target_fieldname, parent_doctype_for_perm
                    )
                    return frappe.qb.DocType(target_doctype)[target_fieldname]

                child_field_handler = ChildTableField(
                    doctype=doctype,
                    fieldname=target_fieldname,
                    parent_doctype=self.doctype,
                    parent_fieldname=parent_fieldname,
                )

                parent_doctype_for_perm = self.doctype
                self.check_filter_field_permission(target_doctype, target_fieldname, parent_doctype_for_perm)

                self.query = child_field_handler.apply_join(self.query, engine=self)
                return child_field_handler.field
            else:
                from frappe.model import child_table_fields, default_fields, optional_fields

                if self.doctype in CORE_DOCTYPES:
                    meta = None
                else:
                    try:
                        meta = frappe.get_meta(self.doctype)
                    except frappe.DoesNotExistError:
                        meta = None

                if (
                    meta
                    and not doctype
                    and target_fieldname not in default_fields + optional_fields + child_table_fields
                    and not meta.has_field(target_fieldname)
                ):
                    for df in meta.get_table_fields(include_computed=True):
                        try:
                            child_meta = frappe.get_meta(df.options)
                        except frappe.DoesNotExistError:
                            continue

                        if child_meta.has_field(target_fieldname):
                            child_field_handler = ChildTableField(
                                doctype=df.options,
                                fieldname=target_fieldname,
                                parent_doctype=self.doctype,
                                parent_fieldname=df.fieldname,
                            )
                            parent_doctype_for_perm = self.doctype
                            self.check_filter_field_permission(
                                df.options, target_fieldname, parent_doctype_for_perm
                            )
                            self.query = child_field_handler.apply_join(self.query, engine=self)
                            return child_field_handler.field

                self.check_filter_field_permission(target_doctype, target_fieldname, parent_doctype_for_perm)
                return frappe.qb.DocType(target_doctype)[target_fieldname]

    def check_select_field_permission(self, doctype: str, fieldname: str, parent_doctype: str | None = None):
        """Check if the user has permission to select the given field."""
        self._check_field_permission(doctype, fieldname, parent_doctype, for_filtering=False)

    def check_filter_field_permission(self, doctype: str, fieldname: str, parent_doctype: str | None = None):
        """Check if the user has permission to filter/order/group by the given field.

        It allows all permlevel 0 fields for users with select permission,
        and all permitted fields for users with read permission.
        """
        self._check_field_permission(doctype, fieldname, parent_doctype, for_filtering=True)

    def _check_field_permission(
        self, doctype: str, fieldname: str, parent_doctype: str | None = None, for_filtering: bool = False
    ):
        """Check if the user has permission to access the given field."""
        if not self.apply_permissions or frappe.session.user == "Administrator":
            return

        if fieldname in OPTIONAL_FIELDS:
            return

        meta = frappe.get_meta(doctype)
        if not meta.get_permissions(parenttype=parent_doctype):
            return

        permission_type = self.get_permission_type(doctype, parent_doctype)
        if parent_doctype and permission_type == "select":
            frappe.throw(
                _("You do not have permission to access child table field: {0}").format(
                    frappe.bold(f"{doctype}.{fieldname}")
                ),
                frappe.PermissionError,
            )

        permission_source = (
            self._get_filterable_fields if for_filtering else self._get_cached_permitted_fields
        )
        permitted_fields = permission_source(doctype, parent_doctype, permission_type)

        if fieldname not in permitted_fields:
            frappe.throw(
                _("You do not have permission to access field: {0}").format(
                    frappe.bold(f"{doctype}.{fieldname}")
                ),
                frappe.PermissionError,
                title=_("Permission Error"),
            )

    def _get_cached_permitted_fields(self, doctype: str, parenttype: str | None, permission_type: str) -> set:
        """Get permitted fields with caching to avoid redundant lookups."""
        cache_key = (doctype, parenttype, permission_type)
        if cache_key not in self.permitted_fields_cache:
            self.permitted_fields_cache[cache_key] = set(
                get_permitted_fields(
                    doctype=doctype,
                    parenttype=parenttype,
                    permission_type=permission_type,
                    ignore_virtual=True,
                    user=self.user,
                )
            )
        return self.permitted_fields_cache[cache_key]

    def _get_filterable_fields(
        self, doctype: str, parenttype: str | None = None, permission_type: str | None = None
    ) -> set:
        """Get fields that can be used in filters/order by/group by.

        For users with only select permission on parent doctypes, this returns
        all permlevel 0 fields (not just search fields which are used for selected fields).
        For users with read permission, returns standard permitted fields.
        """
        if permission_type is None:
            permission_type = self.get_permission_type(doctype, parenttype)

        if permission_type == "select":
            meta = frappe.get_meta(doctype)

            if meta.istable:
                return set()

            cache_key = (doctype, None, "_filterable_select")
            if cache_key not in self.permitted_fields_cache:
                if doctype in PERMITTED_CORE_DOCTYPES and doctype != "User":
                    self.permitted_fields_cache[cache_key] = set(meta.get_valid_columns())
                else:
                    permlevel_0_fields = set(meta.default_fields) | OPTIONAL_FIELDS
                    for df in meta.get_fieldnames_with_value(with_field_meta=True, with_virtual_fields=False):
                        if df.permlevel == 0:
                            permlevel_0_fields.add(df.fieldname)
                    if doctype == "User":
                        permlevel_0_fields.add("user_type")
                    self.permitted_fields_cache[cache_key] = permlevel_0_fields
            return self.permitted_fields_cache[cache_key]
        else:
            permitted_fields = self._get_cached_permitted_fields(doctype, parenttype, permission_type)
            if doctype == "User" and "user_type" not in permitted_fields:
                return permitted_fields | {"user_type"}
            return permitted_fields

    def parse_string_field(self, field: str):
        """
        Parses a field string into a pypika Field object.

        Handles:
        - *
        - simple_field
        - `quoted_field`
        - tabDocType.simple_field
        - `tabDocType`.`quoted_field`
        - `tabTable Name`.`quoted_field`
        - Aliases for all above formats (e.g., field as alias)
        """
        if field == "*":
            return self.table.star

        alias = None
        field_part = field
        if " as " in field.lower():
            parts = re.split(r"\s+as\s+", field, flags=re.IGNORECASE)
            if len(parts) > 1:
                field_part = parts[0].strip()
                alias = parts[1].strip().strip("`\"'")

        match = FIELD_PARSE_REGEX.match(field_part)

        if not match:
            frappe.throw(_("Could not parse field: {0}").format(field))

        groups = match.groups()
        table_name = groups[1]
        field_name = groups[3]

        if table_name:
            doctype_name = table_name[3:] if table_name.startswith("tab") else table_name
            table_obj = frappe.qb.DocType(doctype_name)
            pypika_field = table_obj[field_name]
        else:
            pypika_field = self.table[field_name]

        if alias:
            return pypika_field.as_(alias)
        else:
            return pypika_field

    def parse_fields(
        self, fields: str | list | tuple | set | Field | AggregateFunction | None
    ) -> "list[Field | AggregateFunction | Criterion | DynamicTableField | ChildQuery]":
        if not fields:
            return []

        if isinstance(fields, Term):
            return [fields]

        initial_field_list = []
        if isinstance(fields, str):
            initial_field_list.extend(f.strip() for f in COMMA_PATTERN.split(fields) if f.strip())
        elif isinstance(fields, list | tuple | set):
            for item in fields:
                if item is None:
                    continue
                if isinstance(item, str) and "," in item:
                    initial_field_list.extend(f.strip() for f in COMMA_PATTERN.split(item) if f.strip())
                else:
                    initial_field_list.append(item)

        else:
            frappe.throw(_("Fields must be a string, list, tuple, pypika Field, or pypika Function"))

        _fields = []
        for item in initial_field_list:
            if isinstance(item, str):
                if sanitized_item := _validate_select_field(item.strip()):
                    parsed = self._parse_single_field_item(sanitized_item)
                    if isinstance(parsed, list):
                        _fields.extend(parsed)
                    elif parsed:
                        _fields.append(parsed)
            else:
                parsed = self._parse_single_field_item(item)
                if isinstance(parsed, list):
                    _fields.extend(parsed)
                elif parsed:
                    _fields.append(parsed)

        return _fields

    def _parse_single_field_item(
        self, field: str | Criterion | dict | Field | Term
    ) -> "list | Criterion | Field | DynamicTableField | ChildQuery | None":
        """Parses a single item from the fields list/tuple. Assumes comma-separated strings have already been split."""
        if isinstance(field, Term):
            return field
        elif isinstance(field, dict):
            function_parser = SQLFunctionParser(engine=self)
            if function_parser.is_function_dict(field):
                return function_parser.parse_function(field)
            elif function_parser.is_operator_dict(field):
                return function_parser.parse_operator(field)
            else:
                _parsed_fields = []
                for child_field, child_fields_list in field.items():
                    if child_field.isupper():
                        frappe.throw(
                            _("Unsupported function or operator: {0}").format(child_field),
                            frappe.ValidationError,
                        )

                    if not isinstance(child_fields_list, list | tuple | set):
                        frappe.throw(
                            _("Child query fields for '{0}' must be a list or tuple.").format(child_field)
                        )
                    _parsed_fields.append(ChildQuery(child_field, list(child_fields_list), self.doctype))
                return _parsed_fields

        if not isinstance(field, str):
            frappe.throw(_("Invalid field type: {0}").format(type(field)))

        if parsed := DynamicTableField.parse(field, self.doctype):
            return parsed
        else:
            return self.parse_string_field(field)

    def _normalize_postgres_order_field(self, field):
        """In PostgreSQL order_by fields need to either be in group_by or be aggregated
        when used with select and group_by"""
        if self.query._distinct or isinstance(field, int):
            return field
        current_sql = field.get_sql() if hasattr(field, "get_sql") else str(field)
        if current_sql in self._grouped_queries:
            return field
        clean_name = current_sql.strip('"')
        if clean_name in self.field_aliases:
            return field
        if not isinstance(field, functions.AggregateFunction):
            return functions.Max(field)
        return field

    def apply_group_by(self, group_by: str | None = None):
        parsed_group_by_fields = self._validate_group_by(group_by)
        if self.is_postgres and self._is_main_table_pk_group_by(parsed_group_by_fields):
            parsed_group_by_fields += self._joined_link_table_pks()
        self._grouped_queries = {
            f.get_sql() if hasattr(f, "get_sql") else str(f) for f in parsed_group_by_fields
        }
        self.query = self.query.groupby(*parsed_group_by_fields)

    def _is_main_table_pk_group_by(self, parsed_fields: list) -> bool:
        """Group by on just the parent primary key — the dedup form list views send
        along with child-table filters."""
        if len(parsed_fields) != 1:
            return False
        field = parsed_fields[0]
        return (
            isinstance(field, Field)
            and field.name == "name"
            and (field.table is None or field.table == self.table)
        )

    def _joined_link_table_pks(self) -> list[Field]:
        """Primary keys of 1:1 joined link tables, recorded by LinkTableField.apply_join.

        When deduping by the parent primary key, grouping additionally by each link
        table's primary key cannot change the result (at most one link row per
        parent) but satisfies postgres' functional-dependency rule for the link
        table's selected columns, e.g. title fields fetched for
        `show_title_field_in_link` (GH-39851). Child table joins are not recorded:
        grouping by their primary key would undo the dedup.
        """
        return [table["name"] for table in self._joined_link_tables]

    def apply_order_by(self, order_by: str | None):
        if not order_by or order_by == DefaultOrderBy:
            self._apply_default_order_by()
            return

        parsed_order_fields = self._validate_order_by(order_by)
        for order_field, order_direction in parsed_order_fields:
            if self.is_postgres and self.is_aggregate_query:
                self.query = self.query.orderby(
                    self._normalize_postgres_order_field(order_field), order=order_direction
                )
            else:
                self.query = self.query.orderby(order_field, order=order_direction)

    def _can_apply_distinct_order_by(self, order_by: str) -> bool:
        if not isinstance(order_by, str):
            return True

        selected_field_count = 0
        selected_fields = set()
        for field in self.fields:
            if isinstance(field, ChildQuery):
                continue
            term = field.field if isinstance(field, DynamicTableField) else field
            if isinstance(field, LinkTableField):
                selected_fields.add(f"{field.link_fieldname}.{field.fieldname}")
            elif isinstance(field, ChildTableField) and field.parent_fieldname:
                selected_fields.add(f"{field.parent_fieldname}.{field.fieldname}")

            if alias := getattr(field, "alias", None):
                selected_fields.add(alias)
            terms = self._get_star_fields(term) if isinstance(term, Star) else [term]
            selected_field_count += len(terms)
            for term in terms:
                if isinstance(term, JSONColumnCast):
                    term = term.args[0]
                if not isinstance(term, Field):
                    continue
                table = term.table if term.table is not None else self.table
                if table == self.table:
                    selected_fields.add(term.name)
                selected_fields.add(f"{table.get_table_name()}.{term.name}")

        if order_by == DefaultOrderBy:
            order_by = ", ".join(
                f"{self.table.get_table_name()}.{field}"
                for field in get_order_by_fields(get_doctype_sort_info(self.doctype)[0])
            )
        return is_order_by_in_select(order_by, selected_fields, selected_field_count)

    def _get_star_fields(self, star: Star) -> list[Field]:
        table = star.table if star.table is not None else self.table
        columns = frappe.db.get_table_columns(get_doctype_name(table.get_table_name()))
        return [table[column] for column in columns]

    def _apply_default_order_by(self):
        """Apply default ordering based on configured DocType metadata"""
        from pypika.enums import Order

        sort_field, sort_order = get_doctype_sort_info(self.doctype)

        if "," in sort_field:
            for sort_spec in sort_field.split(","):
                if parts := sort_spec.strip().split(maxsplit=1):
                    field_name = parts[0]
                    spec_order = parts[1].lower() if len(parts) > 1 else sort_order.lower()
                    field = self.table[field_name]
                    if self.db_query_compat:
                        order_direction = Order.desc if spec_order == "desc" else Order.asc
                    else:
                        order_direction = Order.asc if spec_order == "asc" else Order.desc
                    if self.is_postgres and self.is_aggregate_query:
                        self.query = self.query.orderby(
                            self._normalize_postgres_order_field(field), order=order_direction
                        )
                    else:
                        self.query = self.query.orderby(field, order=order_direction)
        else:
            field = self.table[sort_field]
            if self.db_query_compat:
                order_direction = Order.desc if sort_order.lower() == "desc" else Order.asc
            else:
                order_direction = Order.asc if sort_order.lower() == "asc" else Order.desc
            if self.is_postgres and self.is_aggregate_query:
                self.query = self.query.orderby(
                    self._normalize_postgres_order_field(field), order=order_direction
                )
            else:
                self.query = self.query.orderby(field, order=order_direction)

    def _parse_backtick_field_notation(self, field_name: str) -> tuple[str, str] | None:
        """
        Parse backtick field notation like `tabDocType`.`fieldname` or `tabDocType`.fieldname and return (doctype_name, field_name).
        Uses BACKTICK_FIELD_PARSE_REGEX for fast parsing.
        Returns None if the notation is invalid.
        """
        match = BACKTICK_FIELD_PARSE_REGEX.match(field_name.strip())
        if not match:
            return None

        return (match.group(1), match.group(3))

    def _validate_and_parse_field_for_clause(self, field_name: str, clause_name: str) -> Field | int:
        """
        Common helper to validate and parse field names for GROUP BY and ORDER BY clauses.

        Args:
            field_name: The field name to validate and parse
            clause_name: Name of the SQL clause (for error messages) - 'Group By' or 'Order By'

        Returns:
            Parsed Field object ready for use in pypika query
        """
        if field_name.isdigit():
            return int(field_name)

        if field_name in self.field_aliases:
            if (
                clause_name == "Group By"
                and self.apply_permissions
                and field_name in frappe.get_meta(self.doctype).get_valid_columns()
            ):
                self.check_filter_field_permission(self.doctype, field_name)
            return Field(field_name)

        if "`" in field_name:
            if parsed := self._parse_backtick_field_notation(field_name):
                table_name, field_name = parsed
                self.check_filter_field_permission(table_name, field_name)
                return self._cast_json_column(frappe.qb.DocType(table_name)[field_name])

            frappe.throw(
                _("{0} has invalid backtick notation: {1}").format(clause_name, field_name),
                frappe.ValidationError,
            )

        dynamic_field = DynamicTableField.parse(field_name, self.doctype, allow_tab_notation=False)
        if dynamic_field:
            if isinstance(dynamic_field, ChildTableField):
                self.check_filter_field_permission(
                    dynamic_field.doctype, dynamic_field.fieldname, dynamic_field.parent_doctype
                )
            elif isinstance(dynamic_field, LinkTableField):
                self.check_filter_field_permission(self.doctype, dynamic_field.link_fieldname)
                self.check_filter_field_permission(dynamic_field.doctype, dynamic_field.fieldname)

            self.query = dynamic_field.apply_join(self.query, engine=self)
            return self._cast_json_column(dynamic_field.field)
        else:
            if not SIMPLE_FIELD_PATTERN.match(field_name):
                frappe.throw(
                    _(
                        "Invalid field format in {0}: {1}. Use 'field', 'link_field.field', or 'child_table.field'."
                    ).format(clause_name, field_name),
                    frappe.ValidationError,
                )

            self.check_filter_field_permission(self.doctype, field_name)

            return self._cast_json_column(self.table[field_name])

    def _validate_group_by(self, group_by: str) -> list[Field]:
        """Validate the group_by string argument, apply joins for dynamic fields, and return parsed Field objects."""
        if not isinstance(group_by, str):
            frappe.throw(_("Group By must be a string"), TypeError)

        parsed_fields = []
        for part in group_by.split(","):
            field_name = part.strip()
            if not field_name:
                continue

            parsed_field = self._validate_and_parse_field_for_clause(field_name, "Group By")
            parsed_fields.append(parsed_field)

        return parsed_fields

    def _validate_order_by(self, order_by: str) -> list[tuple[Field | int, Order]]:
        """Validate the order_by string argument, apply joins for dynamic fields, and return parsed Field objects with directions."""
        if not isinstance(order_by, str):
            frappe.throw(_("Order By must be a string"), TypeError)

        valid_directions = {"asc", "desc"}
        parsed_order_fields = []

        for declaration in order_by.split(","):
            if _order_by := declaration.strip():
                parts = _order_by.split()
                direction = None
                field_name = _order_by

                if len(parts) > 1 and parts[-1].lower() in valid_directions:
                    direction = parts[-1].lower()
                    field_name = " ".join(parts[:-1])

                if self.db_query_compat:
                    order_direction = Order.desc if direction == "desc" else Order.asc
                else:
                    order_direction = Order.asc if direction == "asc" else Order.desc

                assert order_direction in (Order.asc, Order.desc), "order direction must be asc or desc"

                parsed_field = self._validate_and_parse_field_for_clause(field_name, "Order By")
                parsed_order_fields.append((parsed_field, order_direction))

                if direction and direction not in valid_directions:
                    frappe.throw(
                        _("Invalid direction in Order By: {0}. Must be 'ASC' or 'DESC'.").format(direction),
                        ValueError,
                    )

        return parsed_order_fields

    def check_select_permission(self):
        """Check if user has select (or read) permission on the doctype"""
        if not frappe.has_permission(
            self.doctype, "select", user=self.user, parent_doctype=self.parent_doctype
        ):
            self._raise_permission_error()

    def _raise_permission_error(self, doctype=None):
        frappe.throw(
            title=_("Permission Error"),
            msg=_("Insufficient Permission for {0}").format(frappe.bold(doctype or self.doctype)),
            exc=frappe.PermissionError,
        )

    def apply_field_permissions(self):
        """Filter the list of fields based on permlevel."""
        allowed_fields = []
        parent_permission_type = self.get_permission_type(self.doctype)

        permitted_fields_set = self._get_cached_permitted_fields(
            self.doctype, self.parent_doctype, parent_permission_type
        )

        for field in self.fields:
            if isinstance(field, ChildTableField):
                if parent_permission_type == "select":
                    continue

                if field.parent_fieldname:
                    parent_meta = frappe.get_meta(self.doctype)
                    if parent_meta.get_field(
                        field.parent_fieldname
                    ).permlevel not in parent_meta.get_permlevel_access(
                        parent_permission_type, user=self.user
                    ):
                        continue

                permitted_child_fields_set = self._get_cached_permitted_fields(
                    field.doctype,
                    field.parent_doctype,
                    self.get_permission_type(field.doctype, field.parent_doctype),
                )
                if field.fieldname in permitted_child_fields_set:
                    allowed_fields.append(field)
            elif isinstance(field, LinkTableField):
                if field.link_fieldname in permitted_fields_set:
                    target_doctype = field.doctype
                    has_target_perm = frappe.has_permission(
                        target_doctype, "select", user=self.user
                    ) or frappe.has_permission(target_doctype, "read", user=self.user)

                    if has_target_perm:
                        permitted_target_fields_set = self._get_cached_permitted_fields(
                            target_doctype, None, self.get_permission_type(target_doctype)
                        )
                        if field.fieldname in permitted_target_fields_set:
                            allowed_fields.append(field)
            elif isinstance(field, ChildQuery):
                if parent_permission_type == "select":
                    continue

                parent_meta = frappe.get_meta(self.doctype)
                if parent_meta.get_field(field.fieldname).permlevel not in parent_meta.get_permlevel_access(
                    parent_permission_type, user=self.user
                ):
                    continue

                permitted_child_fields_set = self._get_cached_permitted_fields(
                    field.doctype,
                    field.parent_doctype,
                    self.get_permission_type(field.doctype, field.parent_doctype),
                )
                field.fields = [f for f in field.fields if f in permitted_child_fields_set]
                if field.fields:
                    allowed_fields.append(field)
            elif isinstance(field, Field):
                if field.name == "*":
                    allowed_fields.extend(self.parse_fields(list(permitted_fields_set)))
                elif field.name in OPTIONAL_FIELDS or field.name in permitted_fields_set:
                    allowed_fields.append(field)

            elif isinstance(field, Term):
                allowed_fields.append(field)

        return allowed_fields

    def get_user_permission_conditions(
        self, doctype: str | None = None, table: Table | None = None
    ) -> list[Criterion]:
        """Build conditions for user permissions."""
        doctype = doctype or self.permission_doctype
        table = table or self.permission_table
        conditions = []

        if self.ignore_user_permissions:
            return conditions

        user_permissions = frappe.permissions.get_user_permissions(self.user)

        if not user_permissions:
            return conditions

        doctype_link_fields = self.get_doctype_link_fields(doctype)
        for df in doctype_link_fields:
            if df.get("ignore_user_permissions"):
                continue

            user_permission_values = user_permissions.get(df.get("options"), {})
            if user_permission_values:
                docs = []
                for permission in user_permission_values:
                    if not permission.get("applicable_for"):
                        docs.append(permission.get("doc"))
                    elif df.get("fieldname") == "name" and self.reference_doctype:
                        if permission.get("applicable_for") == self.reference_doctype:
                            docs.append(permission.get("doc"))
                    elif permission.get("applicable_for") == doctype:
                        docs.append(permission.get("doc"))

                if docs:
                    field_name = df.get("fieldname")
                    strict_user_permissions = frappe.get_system_settings("apply_strict_user_permissions")
                    if strict_user_permissions:
                        conditions.append(table[field_name].isin(docs))
                    else:
                        empty_value_condition = functions.IfNull(table[field_name], "") == ""
                        value_condition = table[field_name].isin(docs)
                        conditions.append(empty_value_condition | value_condition)

        return conditions

    def get_doctype_link_fields(self, doctype: str | None = None):
        doctype = doctype or self.permission_doctype
        meta = frappe.get_meta(doctype)
        doctype_link_fields = [{"options": doctype, "fieldname": "name"}]
        doctype_link_fields.extend(meta.get_link_fields())
        return doctype_link_fields

    def add_permission_conditions(self):
        """
        Logic for adding permission conditions is as follows:

        If no role permissions with read/select exist:
            - apply only share permissions

        If role permissions with read/select exist:
            - apply (if_owner constraints OR user permissions), AND
            - apply permission query conditions

            If if_owner / user permission / permission query constraints are applied,
            final condition = (existing conditions) OR (share condtion)
            (rationale: shared documents trump all other restrictions)

            Else, all documents are accessible based on role permissions.

        For child tables (when parent_doctype is specified):
            - permissions are checked against the parent doctype
            - for non-single parent doctypes: a join to the parent table is added,
                        conditions reference parent fields
            - for single parent doctypes: all permissions are already checked by has_permission,
                        we exit early without adding any conditions
        """

        if not self.apply_permissions:
            return

        if self.permission_doctype != self.doctype:
            parent_meta = frappe.get_meta(self.permission_doctype)
            if parent_meta.issingle:
                return

            parent_name = _cast_autoincrement_name(self.permission_table.name, self.permission_doctype)
            self.query = self.query.inner_join(self.permission_table).on(self.table.parent == parent_name)

        if condition := self.get_permission_conditions(self.permission_doctype, self.permission_table):
            self.query = self.query.where(condition)

    def get_link_table_alias(self, doctype: str, link_fieldname: str) -> str:
        """A stable, unique alias for a linked table joined via a specific link field.

        Keyed by (doctype, link_fieldname) so the select and filter passes of the same
        field share one join, and counted per target doctype so two link fields to the
        same doctype get separate joins. A counter is used instead of the field name so
        the alias can't collide when doctype names contain underscores, and the `tab_`
        prefix keeps it out of the real table namespace, which doctype naming rules
        forbid from starting with an underscore.
        """
        key = (doctype, link_fieldname)
        if key not in self.link_table_aliases:
            count = self.link_table_counts.get(doctype, 0) + 1
            self.link_table_counts[doctype] = count
            self.link_table_aliases[key] = f"tab_{doctype}_{count}"
        return self.link_table_aliases[key]

    def get_permission_conditions(self, doctype: str, table: Table) -> Criterion | None:
        role_permissions = frappe.permissions.get_role_permissions(doctype, user=self.user)
        has_role_permission = role_permissions.get("read") or role_permissions.get("select")

        if not has_role_permission:
            shared_docs = frappe.share.get_shared(doctype, self.user)
            if not shared_docs:
                self._raise_permission_error(doctype=doctype)

            return table.name.isin(shared_docs)

        conditions = []

        if self.requires_owner_constraint(role_permissions):
            conditions.append(table.owner == self.user)
        elif user_perm_conditions := self.get_user_permission_conditions(doctype, table):
            conditions.extend(user_perm_conditions)

        conditions.extend(self.get_permission_query_conditions(doctype, table))

        if not conditions:
            return

        where_condition = Criterion.all(conditions)

        shared_docs = frappe.share.get_shared(doctype, self.user)
        if shared_docs:
            where_condition |= table.name.isin(shared_docs)

        return where_condition

    def get_queried_tables(self) -> list[str]:
        """Extract all table names involved in the current query."""
        tables = []
        for table in self.query._from:
            tables.append(table.get_sql())

        for join in self.query._joins:
            tables.append(join.item.get_sql())
        return list(set(tables))

    def get_permission_query_conditions(
        self, doctype: str | None = None, table: Table | None = None
    ) -> list["Criterion"]:
        """Add permission query conditions from hooks and server scripts"""
        from frappe.core.doctype.server_script.server_script_utils import get_server_script_map

        doctype = doctype or self.permission_doctype
        conditions = []
        hooks = frappe.get_hooks("permission_query_conditions", {})
        condition_methods = hooks.get(doctype, []) + hooks.get("*", [])

        for method in condition_methods:
            if c := frappe.call(frappe.get_attr(method), self.user, doctype=doctype):
                conditions.append(RawCriterion(f"({c})") if isinstance(c, str) else c)

        active_child_tables = []
        current_tables = self.get_queried_tables()
        if len(current_tables) > 1:
            main_table_name = f"tab{self.doctype}"
            for table_name in current_tables:
                if table_name != main_table_name:
                    active_child_tables.append(table_name)

        if permission_script_name := get_server_script_map().get("permission_query", {}).get(doctype):
            script = frappe.get_doc("Server Script", permission_script_name)
            if condition := script.get_permission_query_conditions(
                self.user, active_child_tables=active_child_tables
            ):
                conditions.append(RawCriterion(f"({condition})"))

        if conditions and getattr(table, "alias", None):
            base_table = frappe.qb.DocType(doctype)
            permitted_names = (
                frappe.qb.from_(base_table).select(base_table.name).where(Criterion.all(conditions))
            )
            return [table.name.isin(permitted_names)]
        return conditions

    def get_permission_type(
        self, doctype: str, parent_doctype: str | None = None
    ) -> Literal["read", "select"]:
        """Get permission type (select/read) based on user permissions.

        Args:
            doctype: The doctype to check permissions for.
            parent_doctype: The parent of the specified doctype. If passed, we assume that `doctype` is a child table,
                            and fall back to checking permissions from this parent.

        Returns:
            The allowed permission type (read|select).
        """
        if parent_doctype:
            return self.get_permission_type(parent_doctype)

        if frappe.only_has_select_perm(doctype, user=self.user):
            return "select"
        return "read"

    def requires_owner_constraint(self, role_permissions):
        """Return True if "select" or "read" isn't available without being creator."""
        if not role_permissions.get("has_if_owner_enabled"):
            return

        if_owner_perms = role_permissions.get("if_owner")
        if not if_owner_perms:
            return

        for perm_type in ("select", "read"):
            if role_permissions.get(perm_type) and perm_type not in if_owner_perms:
                return

        return True

    def build_match_conditions(self, as_condition: bool = True) -> str | list:
        """Build permission-based conditions for the doctype."""
        if as_condition:
            condition = self.get_permission_conditions(self.doctype, self.table)
            if condition:
                quote_char = "`" if self.is_mariadb else '"'
                return condition.get_sql(with_namespace=True, quote_char=quote_char, subquery=True)
            return ""

        if not self.ignore_user_permissions:
            match_filters = []
            user_permissions = frappe.permissions.get_user_permissions(self.user)
            if not user_permissions:
                return match_filters

            permission_filters = {}
            for df in self.get_doctype_link_fields(self.doctype):
                if df.get("ignore_user_permissions"):
                    continue

                options = df.get("options")

                if user_permission_values := user_permissions.get(options, {}):
                    docs = []

                    for permission in user_permission_values:
                        applicable_for = permission.get("applicable_for")
                        doc = permission.get("doc")
                        if not applicable_for:
                            docs.append(doc)

                        elif df.get("fieldname") == "name" and self.reference_doctype:
                            if applicable_for == self.reference_doctype:
                                docs.append(doc)

                        elif applicable_for == self.doctype:
                            docs.append(doc)

                    if docs:
                        permission_filters[options] = docs

            if permission_filters:
                match_filters.append(permission_filters)

            return match_filters

        return []

    def build_filter_conditions(
        self, filters, conditions: list, ignore_permissions: bool | None = None
    ) -> None:
        if not filters:
            return

        original_apply_permissions = self.apply_permissions
        if ignore_permissions is not None:
            self.apply_permissions = not ignore_permissions

        try:
            criteria_list = []
            self.apply_filters(filters, collect=criteria_list)

            quote_char = "`" if self.is_mariadb else '"'
            for c in criteria_list:
                if self.is_mariadb:
                    for node in c.nodes_():
                        if isinstance(node, ValueWrapper) and isinstance(node.value, str):
                            node.value = node.value.replace("\\", "\\\\")
                conditions.append(c.get_sql(with_namespace=True, quote_char=quote_char))
        finally:
            self.apply_permissions = original_apply_permissions

    def _get_field_doctype(self, field: Term, default: str) -> str:
        """The doctype a parsed field's table belongs to; a joined table is not the query's own."""
        table = getattr(field, "table", None)
        if table is None:
            return default
        try:
            return get_doctype_name(getattr(table, "_table_name", None) or table.get_sql())
        except Exception:
            return default

    def _cast_json_column(self, field: Term, doctype: str | None = None) -> Term:
        """postgres `json` has no comparison or ordering operators, so use the column's text."""
        if not self.is_postgres or not isinstance(field, Field) or field.name == "*":
            return field
        doctype = doctype or self._get_field_doctype(field, self.doctype)
        if not self._is_json_field(doctype, field.name):
            return field
        return JSONColumnCast(field, "varchar")

    def _cast_json_select_field(self, field: Term) -> Term:
        """Keep the alias so the cast does not rename the column in the result."""
        cast = self._cast_json_column(field)
        return cast if cast is field else cast.as_(field.alias or field.name)

    def _cast_json_select_fields(self, fields: list) -> list:
        """`*` cannot be cast, so list its columns out when one of them is JSON."""
        cast_fields = []
        for field in fields:
            if not isinstance(field, Star):
                cast_fields.append(self._cast_json_select_field(field))
                continue
            columns = [self._cast_json_select_field(column) for column in self._get_star_fields(field)]
            has_json_column = any(isinstance(column, JSONColumnCast) for column in columns)
            cast_fields.extend(columns if has_json_column else [field])
        return cast_fields

    def _is_json_field(self, doctype: str, fieldname: str) -> bool:
        from frappe.model.meta import get_default_df

        if get_default_df(fieldname) or fieldname in OPTIONAL_FIELDS:
            return False
        docfield = self._get_docfield(doctype, fieldname)
        return bool(docfield) and docfield.fieldtype == "JSON"

    def _get_is_set_empty_value(self, doctype: str, fieldname: str) -> int | str | None:
        from frappe.model.meta import get_default_df

        docfield = get_default_df(fieldname) or self._get_docfield(doctype, fieldname)
        return IS_SET_EMPTY_VALUES.get(docfield.fieldtype, "") if docfield else ""

    def _get_docfield(self, doctype: str, fieldname: str):
        """Core doctypes read the stored DocType: loading their meta queries Custom Field and
        Property Setter through this engine, so `get_meta` would recurse."""
        from frappe.model.meta import Meta

        if doctype.startswith("__") or doctype in TABLES_WITHOUT_DOCTYPE:
            return None

        meta = frappe.client_cache.get_value(f"doctype_meta::{doctype}")
        if meta is None:
            try:
                if doctype in CORE_DOCTYPES:
                    meta = frappe.get_cached_doc("DocType", doctype)
                else:
                    meta = frappe.get_meta(doctype)
            except frappe.DoesNotExistError:
                return None

        if isinstance(meta, Meta):
            return meta.get_field(fieldname)
        return next((df for df in meta.fields if df.fieldname == fieldname), None)

    def _is_field_nullable(self, doctype: str, fieldname: str) -> bool:
        """Check if a field can contain NULL values."""
        if fieldname in ("name", "modified", "creation"):
            return False

        try:
            if (meta := frappe.client_cache.get_value(f"doctype_meta::{doctype}")) is None:
                return True

            if (df := meta.get_field(fieldname)) is None:
                return True

        except Exception:
            return True

        if df.fieldtype in ("Check", "Float", "Int", "Currency", "Percent"):
            return False

        if getattr(df, "not_nullable", False):
            return False

        return True

    def _get_ifnull_fallback(self, doctype: str, fieldname: str) -> int | str:
        """Get type-appropriate fallback value for NULL comparisons."""
        try:
            meta = frappe.get_meta(doctype)
            df = meta.get_field(fieldname)
        except Exception:
            if frappe.db.db_type == "postgres":
                """check type and accordingly choose fallback (to avoid postgres type cast errors)"""
                target_table = frappe.utils.get_table_name(doctype)
                info_schema = frappe.qb.Schema("information_schema")
                columns = info_schema.columns
                current_schema = frappe.conf.get("db_schema", "public")
                res = (
                    frappe.qb.from_(columns)
                    .select(columns.data_type)
                    .where(
                        (columns.table_name == target_table)
                        & (columns.column_name == fieldname)
                        & (columns.table_schema == current_schema)
                    )
                ).run(pluck=True)
                data_type = res[0] if res else None
                if data_type in ("smallint", "bigint", "integer", "numeric"):
                    return 0
            return ""

        if df is None:
            from frappe.model.meta import get_default_df

            df = get_default_df(fieldname)

        return IFNULL_FALLBACK_VALUES.get(df.fieldtype, "") if df else ""

    def _should_apply_ifnull(self, doctype: str, fieldname: str, operator: str, value: Any) -> bool:
        """Determine if IFNULL wrapping is needed for a filter condition."""
        if not self.db_query_compat:
            return False

        if not self._is_field_nullable(doctype, fieldname):
            return False

        if value is None:
            return False

        if operator.lower() in ("like", "is"):
            return False

        if operator.lower() == "=" and value:
            return False

        try:
            meta = frappe.get_meta(doctype)
            df = meta.get_field(fieldname)
        except Exception:
            df = None

        is_datetime_field = df and df.fieldtype in ("Date", "Datetime") if df else False
        is_creation_or_modified = fieldname in ("creation", "modified")

        if operator.lower() in (">", ">="):
            if is_datetime_field or is_creation_or_modified:
                return False

        if operator.lower() == "between":

            if is_datetime_field or is_creation_or_modified:
                return False

        if operator.lower() == "in":
            if isinstance(value, list | tuple):
                has_null_or_empty = any(v is None or v == "" for v in value)
                return has_null_or_empty
            return False

        if operator.lower() == "not in":
            return True

        if operator.lower() == "<":
            if is_datetime_field or is_creation_or_modified:
                return True

        return True


class DynamicTableField:
    def __init__(
        self,
        doctype: str,
        fieldname: str,
        parent_doctype: str,
        alias: str | None = None,
    ) -> None:
        self.doctype = doctype
        self.fieldname = fieldname
        self.alias = alias
        self.parent_doctype = parent_doctype

    def __str__(self) -> str:
        table_name = f"`tab{self.doctype}`"
        fieldname = f"`{self.fieldname}`"
        if frappe.db.db_type == "postgres":
            table_name = table_name.replace("`", '"')
            fieldname = fieldname.replace("`", '"')
        alias = f"AS {self.alias}" if self.alias else ""
        return f"{table_name}.{fieldname} {alias}".strip()

    @staticmethod
    def parse(field: str, doctype: str, allow_tab_notation: bool = True):
        if "." in field:
            alias = None
            if " as " in field.lower():
                parts = re.split(r"\s+as\s+", field, flags=re.IGNORECASE)
                if len(parts) > 1:
                    field_part = parts[0].strip()
                    alias = parts[-1].strip().strip("`\"'")
                    field = field_part

            child_match = None
            if allow_tab_notation:
                child_match = CHILD_TABLE_FIELD_PATTERN.match(field)

            if child_match:
                child_doctype_name = child_match.group(1)
                child_field = child_match.group(3)

                if child_doctype_name == doctype:
                    return None
                return ChildTableField(child_doctype_name, child_field, doctype, alias=alias)
            else:
                if "." not in field:
                    return None

                parts = field.split(".", 1)
                if len(parts) != 2:
                    return None
                potential_parent_fieldname, target_fieldname = parts

                if (
                    not potential_parent_fieldname.replace("_", "").isalnum()
                    or not target_fieldname.replace("_", "").isalnum()
                ):
                    return None

                try:
                    meta = frappe.get_meta(doctype)
                    if not meta.has_field(potential_parent_fieldname):
                        return None

                    linked_field = meta.get_field(potential_parent_fieldname)
                except Exception:
                    return None

                if linked_field:
                    linked_doctype = linked_field.options
                    if linked_field.fieldtype == "Link":
                        return LinkTableField(
                            linked_doctype, target_fieldname, doctype, potential_parent_fieldname, alias=alias
                        )
                    elif linked_field.fieldtype in frappe.model.table_fields:
                        return ChildTableField(
                            linked_doctype, target_fieldname, doctype, potential_parent_fieldname, alias=alias
                        )

        return None

    def apply_select(
        self, query: QueryBuilder, engine: "Engine" = None, cast_json: bool = False
    ) -> QueryBuilder:
        query = self.apply_join(query, engine=engine)
        field = self.field.as_(self.alias or None)
        return query.select(engine._cast_json_select_field(field) if cast_json else field)

    def apply_join(self, query: QueryBuilder, engine: "Engine" = None) -> QueryBuilder:
        raise NotImplementedError


class ChildTableField(DynamicTableField):
    def __init__(
        self,
        doctype: str,
        fieldname: str,
        parent_doctype: str,
        parent_fieldname: str | None = None,
        alias: str | None = None,
    ) -> None:
        self.doctype = doctype
        self.fieldname = fieldname
        self.alias = alias
        self.parent_doctype = parent_doctype
        self.parent_fieldname = parent_fieldname
        self.table = frappe.qb.DocType(self.doctype)
        self.field = self.table[self.fieldname]

    def apply_join(self, query: QueryBuilder, engine: "Engine" = None) -> QueryBuilder:
        main_table = frappe.qb.DocType(self.parent_doctype)
        if not query.is_joined(self.table):
            parent_name = _cast_autoincrement_name(main_table.name, self.parent_doctype)
            join_conditions = (self.table.parent == parent_name) & (
                self.table.parenttype == self.parent_doctype
            )
            if self.parent_fieldname:
                join_conditions &= self.table.parentfield == self.parent_fieldname
            query = query.left_join(self.table).on(join_conditions)
        return query


class LinkTableField(DynamicTableField):
    def __init__(
        self,
        doctype: str,
        fieldname: str,
        parent_doctype: str,
        link_fieldname: str,
        alias: str | None = None,
    ) -> None:
        super().__init__(doctype, fieldname, parent_doctype, alias=alias)
        self.link_fieldname = link_fieldname
        self.table = frappe.qb.DocType(self.doctype)
        self.field = self.table[self.fieldname]

    def apply_join(self, query: QueryBuilder, engine: "Engine" = None) -> QueryBuilder:
        if engine is not None:
            alias = engine.get_link_table_alias(self.doctype, self.link_fieldname)
            self.table = frappe.qb.DocType(self.doctype).as_(alias)
            self.field = self.table[self.fieldname]

        main_table = frappe.qb.DocType(self.parent_doctype)
        if not query.is_joined(self.table):
            link_name = _cast_autoincrement_name(self.table.name, self.doctype)
            clause = link_name == getattr(main_table, self.link_fieldname)

            if engine and engine.apply_permissions:
                if condition := engine.get_permission_conditions(self.doctype, self.table):
                    clause &= condition

            query = query.left_join(self.table).on(clause)
            if engine is not None:
                engine._joined_link_tables.append(self.table)

        return query


class ChildQuery:
    def __init__(
        self,
        fieldname: str,
        fields: list,
        parent_doctype: str,
    ) -> None:
        field = frappe.get_meta(parent_doctype).get_field(fieldname)
        if field.fieldtype not in frappe.model.table_fields:
            return
        self.fieldname = fieldname
        self.fields = fields
        self.parent_doctype = parent_doctype
        self.doctype = field.options

    def get_query(self, parent_names=None) -> QueryBuilder:
        filters = {
            "parenttype": self.parent_doctype,
            "parentfield": self.fieldname,
            "parent": ["in", [str(name) for name in parent_names or ()]],
        }
        return frappe.qb.get_query(
            self.doctype,
            fields=[*self.fields, "parent", "parentfield"],
            filters=filters,
            order_by="idx asc",
        )


def get_nested_set_hierarchy_result(doctype: str, name: str, hierarchy: str) -> list[str]:
    """Get matching nodes based on operator."""
    table = frappe.qb.DocType(doctype)
    try:
        lft, rgt = frappe.qb.from_(table).select("lft", "rgt").where(table.name == name).run()[0]
    except IndexError:
        lft, rgt = None, None

    if hierarchy in ("descendants of", "not descendants of", "descendants of (inclusive)"):
        result = (
            frappe.qb.from_(table)
            .select(table.name)
            .where(table.lft > lft)
            .where(table.rgt < rgt)
            .orderby(table.lft, order=Order.asc)
            .run(pluck=True)
        )
        if hierarchy == "descendants of (inclusive)":
            result += [name]
    else:
        result = (
            frappe.qb.from_(table)
            .select(table.name)
            .where(table.lft < lft)
            .where(table.rgt > rgt)
            .orderby(table.lft, order=Order.desc)
            .run(pluck=True)
        )
    return result


def _is_function_call(field_str: str) -> bool:
    """Check if a string is a SQL function call."""
    return bool(FUNCTION_CALL_PATTERN.match(field_str))


@lru_cache(maxsize=1024)
def _validate_select_field(field: str):
    """Validate a field string intended for use in a SELECT clause."""
    if field == "*":
        return field

    if field.isdigit():
        return field

    if _is_function_call(field):
        frappe.throw(
            _(
                "SQL functions are not allowed as strings in SELECT: {0}. Use dict syntax like {{'COUNT': '*'}} instead."
            ).format(field),
            frappe.ValidationError,
        )

    if ALLOWED_FIELD_PATTERN.match(field):
        return field

    frappe.throw(
        _(
            "Invalid field format for SELECT: {0}. Field names must be simple, backticked, table-qualified, aliased, or '*'."
        ).format(field),
        frappe.PermissionError,
    )


class RawCriterion(Term):
    """A class to represent raw SQL string as a criterion.

    Allows using raw SQL strings in pypika queries:
        frappe.qb.from_("DocType").where(RawCriterion("name like 'a%'"))
    """

    def __init__(self, sql_string: str):
        self.sql_string = sql_string
        super().__init__()

    def get_sql(self, **kwargs: Any) -> str:
        return self.sql_string

    def __and__(self, other):
        return CombinedRawCriterion(self, other, "AND")

    def __or__(self, other):
        return CombinedRawCriterion(self, other, "OR")

    def __invert__(self):
        return RawCriterion(f"NOT ({self.sql_string})")


class CombinedRawCriterion(RawCriterion):
    def __init__(self, left, right, operator):
        self.left = left
        self.right = right
        self.operator = operator
        super(RawCriterion, self).__init__()

    def get_sql(self, **kwargs: Any) -> str:
        left_sql = self.left.get_sql(**kwargs) if hasattr(self.left, "get_sql") else str(self.left)
        right_sql = self.right.get_sql(**kwargs) if hasattr(self.right, "get_sql") else str(self.right)
        return f"(({left_sql}) {self.operator} ({right_sql}))"


class SQLFunctionParser:
    """Parser for SQL function dictionaries in query builder fields."""

    def __init__(self, engine):
        self.engine = engine

    def is_function_dict(self, field_dict: dict) -> bool:
        """Check if a dictionary represents a SQL function definition."""
        function_keys = [k for k in field_dict.keys() if k.lower() != "as"]
        return len(function_keys) == 1 and function_keys[0] in FUNCTION_MAPPING

    def is_operator_dict(self, field_dict: dict) -> bool:
        """Check if a dictionary represents an arithmetic operator expression.

        Example: {"ADD": [1, 2], "as": "sum"} or {"DIV": ["total", "count"]}
        """
        operator_keys = [k for k in field_dict.keys() if k.lower() != "as"]
        return len(operator_keys) == 1 and operator_keys[0] in OPERATOR_MAPPING

    def _extract_dict_components(self, d: dict, valid_keys: dict, error_msg: str) -> tuple:
        """Extract name, alias, and args from function/operator dict."""
        name = None
        alias = None
        args = None

        for key, value in d.items():
            if key.lower() == "as":
                alias = value
            else:
                name = key
                args = value

        if not name:
            frappe.throw(_("Invalid {0} dictionary format").format(error_msg), frappe.ValidationError)

        if name not in valid_keys:
            frappe.throw(_("Unsupported {0}: {1}").format(error_msg, name), frappe.ValidationError)

        if alias:
            self._validate_alias(alias)

        return name, alias, args

    def parse_function(self, function_dict: dict) -> Field:
        """Parse a SQL function dictionary into a pypika function call."""
        function_name, alias, function_args = self._extract_dict_components(
            function_dict, FUNCTION_MAPPING, "function or invalid field name"
        )

        func_class = FUNCTION_MAPPING[function_name]

        if isinstance(function_args, str):
            parsed_arg = self._parse_and_validate_argument(function_args, function_name=function_name)
            function_call = func_class(parsed_arg)
        elif isinstance(function_args, list):
            parsed_args = []
            for arg in function_args:
                parsed_arg = self._parse_and_validate_argument(arg, function_name=function_name)
                parsed_args.append(parsed_arg)
            function_call = func_class(*parsed_args)
        elif isinstance(function_args, (int | float)):
            function_call = func_class(function_args)
        elif function_args is None:
            try:
                function_call = func_class()
            except TypeError:
                frappe.throw(
                    _("Function {0} requires arguments but none were provided").format(function_name),
                    frappe.ValidationError,
                )
        else:
            frappe.throw(
                _(
                    "Invalid function argument type: {0}. Only strings, numbers, lists, and None are allowed."
                ).format(type(function_args).__name__),
                frappe.ValidationError,
            )

        if alias:
            return function_call.as_(alias)
        else:
            return function_call

    def parse_operator(self, operator_dict: dict) -> ArithmeticExpression:
        """Parse an arithmetic operator dictionary into a pypika ArithmeticExpression.

        Operators require exactly 2 arguments (left and right operands).
        Arguments can be: numbers, field names, nested functions, or nested operators.
        Example: {"DIV": [1, {"NULLIF": [{"LOCATE": ["'test'", "name"]}, 0]}]}
        """
        operator_name, alias, operator_args = self._extract_dict_components(
            operator_dict, OPERATOR_MAPPING, "operator"
        )

        operator = OPERATOR_MAPPING[operator_name]

        if not isinstance(operator_args, list) or len(operator_args) != 2:
            frappe.throw(
                _("Operator {0} requires exactly 2 arguments (left and right operands)").format(
                    operator_name
                ),
                frappe.ValidationError,
            )

        left = self._parse_and_validate_argument(operator_args[0])
        right = self._parse_and_validate_argument(operator_args[1])

        if not isinstance(left, Term):
            left = ValueWrapper(left)
        if not isinstance(right, Term):
            right = ValueWrapper(right)

        assert isinstance(left, Term) and isinstance(right, Term), "operands must be pypika Terms"
        expression = ArithmeticExpression(operator=operator, left=left, right=right)

        if alias:
            return expression.as_(alias)
        else:
            return expression

    def _parse_and_validate_argument(self, arg, *, function_name: str | None = None):
        """Parse and validate a single function/operator argument against SQL injection.

        Supports:
        - Numbers: 1, 2.5, etc.
        - Strings: field names or quoted literals
        - Nested dicts: functions {"COUNT": "name"} or operators {"ADD": [1, 2]}
        """
        if isinstance(arg, (int | float)):
            return arg
        elif isinstance(arg, str):
            return self._validate_string_argument(arg, function_name=function_name)
        elif isinstance(arg, dict):
            if self.is_function_dict(arg):
                return self.parse_function(arg)
            elif self.is_operator_dict(arg):
                return self.parse_operator(arg)
            else:
                frappe.throw(
                    _("Invalid nested expression: dictionary must represent a function or operator"),
                    frappe.ValidationError,
                )
        elif arg is None:
            return arg
        else:
            frappe.throw(
                _("Invalid argument type: {0}. Only strings, numbers, dicts, and None are allowed.").format(
                    type(arg).__name__
                ),
                frappe.ValidationError,
            )

    def _validate_string_argument(self, arg: str, *, function_name: str | None = None):
        """Validate string arguments to prevent SQL injection."""
        arg = arg.strip()

        if not arg:
            frappe.throw(_("Empty string arguments are not allowed"), frappe.ValidationError)

        if arg == "*":
            if function_name not in STAR_ALLOWED_FUNCTIONS:
                frappe.throw(
                    _("'*' is only allowed in {0} SQL function(s)").format(", ".join(STAR_ALLOWED_FUNCTIONS)),
                    frappe.ValidationError,
                )
            return Star()

        if len(arg) >= 2 and arg[0] in ("'", '"') and arg[-1] == arg[0]:
            return arg[1:-1]

        elif "`" in arg:
            if parsed := self.engine._parse_backtick_field_notation(arg):
                table_name, field_name = parsed
                self.engine.check_select_field_permission(table_name, field_name)
                return Table(f"tab{table_name}")[field_name]
            else:
                frappe.throw(
                    _(
                        "Invalid argument format: {0}. Only quoted string literals or simple field names are allowed."
                    ).format(arg),
                    frappe.ValidationError,
                )

        elif arg.isdigit():
            return int(arg)

        elif self._is_valid_field_name(arg):
            self._check_function_field_permission(arg)
            return self.engine.table[arg]

        else:
            frappe.throw(
                _(
                    "Invalid argument format: {0}. Only quoted string literals or simple field names are allowed."
                ).format(arg),
                frappe.ValidationError,
            )

    def _is_valid_field_name(self, name: str) -> bool:
        """Check if a string is a valid field name."""
        return SIMPLE_FIELD_PATTERN.match(name) is not None

    def _validate_alias(self, alias: str):
        """Validate alias name for SQL injection."""
        if not isinstance(alias, str):
            frappe.throw(_("Alias must be a string"), frappe.ValidationError)

        alias = alias.strip()
        if not alias:
            frappe.throw(_("Empty alias is not allowed"), frappe.ValidationError)

        if not SIMPLE_FIELD_PATTERN.match(alias):
            frappe.throw(
                _("Invalid alias format: {0}. Alias must be a simple identifier.").format(alias),
                frappe.ValidationError,
            )

    def _check_function_field_permission(self, field_name: str):
        if self.engine.apply_permissions and self.engine.doctype:
            self.engine.check_select_field_permission(self.engine.doctype, field_name)
