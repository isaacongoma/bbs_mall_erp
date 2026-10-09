import re

from apps.frappe.database.utils import convert_backtick_identifiers

LOCATE_SUB_PATTERN = re.compile(r"locate\(([^,]+),([^)]+)(\)?)\)", flags=re.IGNORECASE)
LOCATE_QUERY_PATTERN = re.compile(r"locate\(", flags=re.IGNORECASE)
REGEXP_PATTERN = re.compile(
    r"""
      (?P<skip>
          (?<!\w)[eE]'(?:[^'\]|''|\.)*'
        | '(?:[^']|'')*'
        | "(?:[^"]|"")*"
        | \$(?P<tag>\w*)\$.*?\$(?P=tag)\$
        | --[^\n]*
        | /\*.*?\*/
      )
    | \s(?P<negated>NOT\s+)?REGEXP\s
    """,
    flags=re.IGNORECASE | re.DOTALL | re.VERBOSE,
)


def _replace_regexp_operator(match: re.Match) -> str:
    if (skipped := match.group("skip")) is not None:
        return skipped
    return " !~* " if match.group("negated") else " ~* "


def replace_locate_with_strpos(query):
    if LOCATE_QUERY_PATTERN.search(query):
        query = LOCATE_SUB_PATTERN.sub(r"strpos(\2\3, \1)", query)
    return query


def modify_query(query):
    query = convert_backtick_identifiers(str(query))
    query = replace_locate_with_strpos(query)
    return REGEXP_PATTERN.sub(_replace_regexp_operator, query)
