"""This file houses all Frappe specific optimizations and hooks that run on startup or during fork.

Warning: This entire file is private as indicated by `_` prefix in filename.
"""

import faulthandler
import gc
import io
import os
import re
import signal
import sys


def optimize_all():
    """Single entry point to enable all optimizations at right time automatically."""

    optimize_regex_cache()
    optimize_gc_parameters()
    optimize_gc_for_copy_on_write()


def optimize_gc_parameters():
    from frappe.utils import sbool

    if not bool(sbool(os.environ.get("FRAPPE_TUNE_GC", True))):
        return

    g0, g1, g2 = gc.get_threshold()
    gc.set_threshold(g0 * 10, g1 * 2, g2 * 2)


def optimize_regex_cache():
    os.register_at_fork(before=re.purge)


def preload_modules():
    """Import modules before forking so that workers share their memory.

    These modules are used on the hot path of most requests but are not imported by
    ``import frappe.app``. Importing them here lets forked workers share the memory
    through copy-on-write instead of each paying the import cost after the fork.

    Eager import by default.
    """
    if os.environ.get("FRAPPE_PRELOAD_MODULES", "1").strip().lower() in ("0", "false"):
        return

    import gettext

    import babel
    import babel.dates
    import bs4
    import nh3
    import num2words
    import pydantic

    import frappe.boot
    import frappe.client
    import frappe.core.doctype.file.file
    import frappe.core.doctype.user.user
    import frappe.database.query
    import frappe.desk.desktop
    import frappe.desk.form.save
    import frappe.model.db_query
    import frappe.query_builder
    import frappe.utils.background_jobs
    import frappe.utils.data
    import frappe.utils.jinja
    import frappe.utils.jinja_globals
    import frappe.utils.redis_wrapper
    import frappe.utils.safe_exec
    import frappe.utils.typing_validations
    import frappe.website.path_resolver
    import frappe.website.router
    import frappe.website.website_generator


def preload_database_drivers():
    """Import database drivers before forking so that workers share their memory.

    `FRAPPE_PRELOAD_DATABASE_DRIVERS` takes a comma separated list of driver names, e.g.
    "mariadb,postgres". Blank loads mariadb, "none" loads nothing.
    """
    value = os.environ.get("FRAPPE_PRELOAD_DATABASE_DRIVERS", "").strip().lower() or "none"
    if value == "none":
        return

    drivers = {driver.strip() for driver in value.split(",") if driver.strip()}

    if "mariadb" in drivers:
        import frappe.database.mariadb.mysqlclient

    if "postgres" in drivers:
        import frappe.database.postgres.database

    if "sqlite" in drivers:
        import frappe.database.sqlite.database


def register_fault_handler():
    if isinstance(sys.__stderr__, io.TextIOWrapper):
        faulthandler.enable()
        faulthandler.register(signal.SIGUSR1, file=sys.__stderr__)


def optimize_gc_for_copy_on_write():
    from frappe.utils import sbool

    if not bool(sbool(os.environ.get("FRAPPE_TUNE_GC", True))):
        return

    os.register_at_fork(before=freeze_gc)


_gc_frozen = False


def freeze_gc():
    global _gc_frozen
    if _gc_frozen:
        return
    gc.collect()
    gc.freeze()
    _gc_frozen = True
