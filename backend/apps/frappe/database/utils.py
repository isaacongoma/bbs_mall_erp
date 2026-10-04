NestedSetHierarchy = (
    "ancestors of",
    "descendants of",
    "not ancestors of",
    "not descendants of",
    "descendants of (inclusive)",
)

import re

SKIPPED_SPAN_PATTERN = re.compile(
    r"""
      '(?:[^']|'')*'
    | "(?:[^"]|"")*"
    | --[^\n]*
    | /\*.*?\*/
    | `(?:[^`]|``)*`
    """,
    re.DOTALL | re.VERBOSE,
)


def convert_backtick_identifiers(query: str) -> str:
    if "`" not in query:
        return query

    def translate(match: re.Match) -> str:
        span = match.group()
        if not span.startswith("`"):
            return span
        name = span[1:-1].replace("``", "`")
        return '"{}"'.format(name.replace('"', '""'))

    return SKIPPED_SPAN_PATTERN.sub(translate, query)


def commit_after_response(fn):
    return fn
