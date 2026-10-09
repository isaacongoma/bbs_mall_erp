import frappe
from frappe.automation.doctype.automation_trigger_queue.automation_trigger_queue import DEDUP_INDEX, TABLE
from frappe.automation_engine.queue import QUEUE
from frappe.query_builder.utils import db_type_is
from frappe.tests import IntegrationTestCase
from frappe.tests.test_query_builder import unimplemented_for

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = []


class IntegrationTestAutomationTriggerQueue(IntegrationTestCase):
    """
    Integration tests for AutomationTriggerQueue.
    Use this class for testing interactions between multiple components.
    """

    @unimplemented_for(db_type_is.MARIADB)
    def test_reload_keeps_partial_dedup_index(self):
        frappe.reload_doctype(QUEUE, force=True)
        with self.assertQueryCount(0, query_type=("alter", "drop")):
            frappe.reload_doctype(QUEUE, force=True)
        self.assertTrue(frappe.db.has_index(TABLE, DEDUP_INDEX))
