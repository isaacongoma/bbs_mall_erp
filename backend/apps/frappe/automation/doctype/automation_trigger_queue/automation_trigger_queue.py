
import frappe
from frappe.automation_engine.queue import QUEUE, WAITING_STATES
from frappe.model.document import Document

TABLE = f"tab{QUEUE}"
DEDUP_INDEX = "unique_dedup_key"
LOOKUP_INDEX = "pending_lookup"


class AutomationTriggerQueue(Document):
    """A pending trigger waiting for a drain to pick it up.

    `ref_name` is plain Data rather than a Dynamic Link so a queued row
    survives the referenced document being deleted. `resume_run` points at the
    Automation Run a row is resuming after a wait.
    """
    doctype = 'Automation Trigger Queue'


    pass


def on_doctype_update():
    ensure_dedup_indexes()


def ensure_dedup_indexes():
    """Enforce "one waiting row per (automation, document)" in the database.

    MariaDB gets a generated column carrying the key plus a unique index on it, because it has
    no partial indexes. Postgres and SQLite express the rule directly as a partial unique index
    and skip the column: neither can index a virtual column, and CONCAT_WS is not immutable
    enough for a Postgres generated one.
    """
    if frappe.db.db_type == "mariadb":
        _ensure_dedup_column()
        if not frappe.db.has_index(TABLE, DEDUP_INDEX):
            frappe.db.sql_ddl(f"ALTER TABLE `{TABLE}` ADD UNIQUE INDEX `{DEDUP_INDEX}` (`dedup_key`)")
    else:
        _ensure_partial_dedup_index()

    frappe.db.add_index(QUEUE, ["status", "run_after", "triggered_at"], "drain_scan")

    frappe.db.add_index(QUEUE, ["automation", "ref_doctype", "ref_name"], LOOKUP_INDEX)


def _waiting_states_sql() -> str:
    return ", ".join(frappe.db.escape(state) for state in WAITING_STATES)






def _get_partial_dedup_index_definition() -> str | None:
    if frappe.db.db_type == "postgres":
        definition = frappe.db.sql(
            "SELECT indexdef FROM pg_indexes WHERE schemaname = %s AND indexname = %s",
            (frappe.db.db_schema, DEDUP_INDEX),
            pluck=True,
        )
    else:
        definition = frappe.db.sql(
            "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = %s", (DEDUP_INDEX,), pluck=True
        )
    return definition[0] if definition else None


def _covers_waiting_states(definition: str | None) -> bool:
    return bool(definition) and all(state in definition for state in WAITING_STATES)


def _ensure_partial_dedup_index():
    """Rebuild the partial index whenever its predicate no longer matches WAITING_STATES."""
    if _covers_waiting_states(_get_partial_dedup_index_definition()):
        return
    frappe.db.sql_ddl(f"DROP INDEX IF EXISTS `{DEDUP_INDEX}`")
    frappe.db.sql_ddl(
        f"""
        CREATE UNIQUE INDEX `{DEDUP_INDEX}` ON `{TABLE}` (`automation`, `ref_doctype`, `ref_name`)
        WHERE `status` IN ({_waiting_states_sql()}) AND `resume_run` IS NULL
        """
    )


def _ensure_dedup_column():
    """Rebuild the generated column whenever its CASE no longer matches WAITING_STATES."""
    expression = frappe.db.sql(
        """
        SELECT GENERATION_EXPRESSION FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = 'dedup_key'
        """,
        TABLE,
    )
    if expression and _covers_waiting_states(expression[0][0]):
        return
    _rebuild_dedup_column()


def _rebuild_dedup_column():
    if frappe.db.has_index(TABLE, DEDUP_INDEX):
        frappe.db.sql_ddl(f"ALTER TABLE `{TABLE}` DROP INDEX `{DEDUP_INDEX}`")
    if frappe.db.has_column(QUEUE, "dedup_key"):
        frappe.db.sql_ddl(f"ALTER TABLE `{TABLE}` DROP COLUMN `dedup_key`")
        frappe.client_cache.delete_value(f"table_columns::{TABLE}")
    frappe.db.sql_ddl(
        f"""
        ALTER TABLE `{TABLE}`
        ADD COLUMN `dedup_key` VARCHAR(420)
        AS (
            CASE WHEN `status` IN ({_waiting_states_sql()}) AND `resume_run` IS NULL
            THEN CONCAT_WS(':', `automation`, `ref_doctype`, `ref_name`) END
        ) VIRTUAL
        """
    )
