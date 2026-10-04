import inspect
from collections.abc import Callable
from enum import Enum
from importlib import import_module
from typing import Any, get_type_hints

from pypika.queries import (
	Column,
	QueryBuilder,
	_SetOperation,
)
from pypika.terms import PseudoColumn

import frappe
from frappe.query_builder.terms import NamedParameterWrapper

from .builder import Base, MariaDB, Postgres, SQLite


class PseudoColumnMapper(PseudoColumn):
	def __init__(self, name: str) -> None:
		super().__init__(name)

	def get_sql(self, **kwargs):
		if frappe.db.db_type == "postgres":
			from frappe.database.utils import convert_backtick_identifiers

			return convert_backtick_identifiers(self.name)
		return self.name


class db_type_is(Enum):
	MARIADB = "mariadb"
	POSTGRES = "postgres"
	SQLITE = "sqlite"


DB_TYPE_MAP = {
	db_type_is.MARIADB: MariaDB,
	db_type_is.POSTGRES: Postgres,
	db_type_is.SQLITE: SQLite,
}

assert set(DB_TYPE_MAP) == set(db_type_is), "DB_TYPE_MAP must map every db_type_is member to a builder"


class ImportMapper:
	def __init__(self, func_map: dict[db_type_is, Callable]) -> None:
		self.func_map = func_map

	def __call__(self, *args: Any, **kwds: Any) -> Callable:
		db = db_type_is(frappe.conf.db_type)
		return self.func_map[db](*args, **kwds)


class BuilderIdentificationFailed(Exception):
	def __init__(self):
		super().__init__("Couldn't guess builder")


def get_query_builder(type_of_db: str) -> Postgres | MariaDB | SQLite:
	"""Return the query builder object.

	Args:
	        type_of_db: string value of the db used
	"""
	return DB_TYPE_MAP[db_type_is(type_of_db)]


def get_query(*args, **kwargs) -> QueryBuilder:
	from apps.frappe.query_builder.engine import get_query as _get_query

	return _get_query(*args, **kwargs)


def get_attr(method_string):
	modulename = ".".join(method_string.split(".")[:-1])
	methodname = method_string.split(".")[-1]
	return getattr(import_module(modulename), methodname)


def DocType(*args, **kwargs):
	return frappe.qb.DocType(*args, **kwargs)


def Table(*args, **kwargs):
	return frappe.qb.Table(*args, **kwargs)


def execute_query(query, *args, **kwargs):
    query, params = prepare_query(query)
    return frappe.local.db.sql(query, params, *args, **kwargs)


def prepare_query(query):
    param_collector = NamedParameterWrapper()
    query = query.get_sql(param_wrapper=param_collector)
    assert isinstance(query, str), "prepared query must be a SQL string"
    return query, param_collector.parameters


def patch_query_execute():
	"""Patch the Query Builder with helper execute method
	This excludes the use of `frappe.db.sql` method while
	executing the query object
	"""

	QueryBuilder.run = execute_query
	QueryBuilder.walk = prepare_query

	_SetOperation.run = execute_query
	_SetOperation.walk = prepare_query


def patch_query_aggregation():
	"""Patch aggregation functions to frappe.qb"""
	from frappe.query_builder.functions import _avg, _max, _min, _sum

	Base.max = _max
	Base.min = _min
	Base.avg = _avg
	Base.sum = _sum


def patch_get_query():
	Base.get_query = get_query


def patch_like_operators():
	"""Render the query-builder LIKE / NOT LIKE operators as ILIKE / NOT ILIKE on postgres.

	MariaDB's default collation makes LIKE case-insensitive; postgres compares text
	case-sensitively, so a `.like()` search (link-field autocomplete, etc.) would only match
	exact case on postgres. Mapping to ILIKE keeps pattern matching case-insensitive on both
	backends -- matching MariaDB and the like->ilike translation `frappe.db.get_list` already
	applies for its filter path. MariaDB keeps native LIKE.
	"""
	from pypika.terms import Term

	_like, _not_like = Term.like, Term.not_like

	def like(self, expr: str):
		if frappe.db and frappe.db.db_type == "postgres":
			return self.ilike(expr)
		return _like(self, expr)

	def not_like(self, expr: str):
		if frappe.db and frappe.db.db_type == "postgres":
			return self.not_ilike(expr)
		return _not_like(self, expr)

	Term.like = like
	Term.not_like = not_like


def patch_regex_operator():
	"""Render the query-builder regex operator in each backend's native spelling.

	pypika's Term.regex emits " REGEX ", which is an operator on neither backend: MySQL spells it
	REGEXP, postgres uses the case-insensitive match ~*. So `frappe.get_all(filters={"f":
	["regex", ...]})` produced a syntax error everywhere. Emitting the right operator here also
	means a generated query no longer depends on the textual REGEXP rewrite in modify_query.
	"""
	from pypika.enums import Comparator, Matching
	from pypika.terms import BasicCriterion, Term

	class PostgresMatching(Comparator):
		regex = " ~* "

	def regex(self, pattern: str):
		comparator = (
			PostgresMatching.regex if frappe.db and frappe.db.db_type == "postgres" else Matching.regexp
		)
		return BasicCriterion(comparator, self, self.wrap_constant(pattern))

	Term.regex = regex


def patch_all():
	patch_query_execute()
	patch_query_aggregation()
	patch_get_query()
	patch_like_operators()
	patch_regex_operator()
