# Restricted Python execution backing the RunScript automation action, using RestrictedPython --
# the same library real Frappe's frappe.utils.safe_exec wraps for Server Scripts -- rather than a
# bespoke AST sandbox. RestrictedPython's compiler rejects `import`, dunder/private attribute
# access, and anything else outside its restricted grammar at compile time; `safe_builtins`
# strips dangerous names (`open`, `eval`, `exec`, `__import__`, ...) from what the script can
# call. A script cannot escape into arbitrary code execution through normal syntax; it can only
# do what the objects it's handed (doc/target/trigger, a plain `result` dict) let it do, exactly
# like a Frappe Server Script's `doc`.
#
# What this does not guard: CPU/memory exhaustion (an infinite loop) and calling a real method
# on `doc` (e.g. doc.save()) -- the trust model, matching upstream, is that a script that reached
# this action was authored by whoever built the flow, and can do anything the model's own API
# allows. A runaway script is bounded by the Celery task's own time limit (see
# automation_engine/tasks.py), not by this module.
from __future__ import annotations

from RestrictedPython import compile_restricted_exec, safe_globals
from RestrictedPython.Guards import (
    guarded_iter_unpack_sequence,
    guarded_unpack_sequence,
    safe_builtins,
    safer_getattr,
)
from RestrictedPython.PrintCollector import PrintCollector


class ScriptCompileError(Exception):
    pass


def _write_(ob):
    """RestrictedPython's write guard exists to protect a collection's own internal invariants
    (its `full_write_guard` wraps arbitrary objects in a Wrapper that only permits mutation
    through an object-defined `__guarded_setattr__`, which nothing here implements). The actual
    security boundary for this sandbox is read-side: `_getattr_` below (blocks dunder/private
    reads) plus RestrictedPython's compile-time grammar (blocks `import`, `exec`, `eval`, literal
    dunder attribute syntax). Letting a script freely set attributes / items on the objects it
    was handed -- `doc.status = "Closed"`, `result["x"] = 1` -- is the whole point of the action,
    not a hole: it can't reach anything through a write it couldn't already reach through a read.
    """
    return ob


_INPLACE_OPS = {
    "+=": lambda x, y: x + y,
    "-=": lambda x, y: x - y,
    "*=": lambda x, y: x * y,
    "/=": lambda x, y: x / y,
    "//=": lambda x, y: x // y,
    "%=": lambda x, y: x % y,
    "**=": lambda x, y: x**y,
}


def _inplacevar_(op, x, y):
    """Augmented-assignment guard (`total += i`) -- RestrictedPython's transformer requires one
    but ships no default; this is the same handful of operators safe_eval-style evaluators
    elsewhere in this port already allow (see assignment_rule_engine.py's _ALLOWED_BINOPS)."""
    func = _INPLACE_OPS.get(op)
    if not func:
        raise TypeError(f"Operator not allowed: {op}")
    return func(x, y)


def compile_restricted(script: str):
    """Raise ScriptCompileError if `script` doesn't compile under RestrictedPython's grammar."""
    result = compile_restricted_exec(script, filename="<automation_script>")
    if result.errors:
        raise ScriptCompileError("; ".join(result.errors))
    return result.code


def run_restricted(script: str, scope: dict) -> dict:
    """Execute `script` with `doc`/`target`/`trigger`/`payload`/`context` bound from `scope`
    (as passed to actions/base.py's render_context, but with the live objects, not the
    flattened dicts other actions use for templating) and a `result` dict the script can write
    to, mirroring Frappe Server Script's `result` convention."""
    code = compile_restricted(script)
    result: dict = {}
    restricted_globals = dict(safe_globals)
    restricted_globals["__builtins__"] = dict(safe_builtins)
    restricted_globals["_getattr_"] = safer_getattr
    restricted_globals["_write_"] = _write_
    restricted_globals["_getiter_"] = iter
    restricted_globals["_inplacevar_"] = _inplacevar_
    restricted_globals["_iter_unpack_sequence_"] = guarded_iter_unpack_sequence
    restricted_globals["_unpack_sequence_"] = guarded_unpack_sequence
    restricted_globals["_print_"] = PrintCollector
    restricted_globals["doc"] = scope.get("doc")
    restricted_globals["target"] = scope.get("target")
    restricted_globals["trigger"] = scope.get("trigger")
    restricted_globals["payload"] = scope.get("payload") or {}
    restricted_globals["result"] = result

    local_scope: dict = {}
    exec(code, restricted_globals, local_scope)  # noqa: S102 -- the whole point of this module
    return local_scope.get("result", result)
