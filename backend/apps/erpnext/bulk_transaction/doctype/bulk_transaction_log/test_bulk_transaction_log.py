import frappe
from frappe.utils import nowtime, random_string

from erpnext.tests.utils import ERPNextTestSuite


class TestBulkTransactionLog(ERPNextTestSuite):
    def _make_log_doc(self, date):
        doc = frappe.new_doc("Bulk Transaction Log")
        doc.name = date
        return doc

    def _insert_detail(self, date, status="Success"):
        detail = frappe.get_doc(
            {
                "doctype": "Bulk Transaction Log Detail",
                "from_doctype": "Sales Order",
                "to_doctype": "Sales Invoice",
                "transaction_name": "_Test BTLD " + random_string(8),
                "date": date,
                "time": nowtime(),
                "transaction_status": status,
            }
        )
        detail.insert(ignore_permissions=True, ignore_links=True)
        return detail

    def test_load_raises_when_no_detail_rows(self):
        date = "2024-01-01"
        self.assertFalse(
            frappe.db.exists("Bulk Transaction Log Detail", {"date": date}),
            "precondition: no detail rows for this date",
        )

        doc = self._make_log_doc(date)
        self.assertRaises(frappe.DoesNotExistError, doc.load_from_db)

    def test_load_succeeds_and_aggregates_after_detail_inserted(self):
        date = "2024-02-02"

        self.assertRaises(frappe.DoesNotExistError, self._make_log_doc(date).load_from_db)

        self._insert_detail(date, "Success")
        self._insert_detail(date, "Success")
        self._insert_detail(date, "Failed")

        doc = self._make_log_doc(date)
        doc.load_from_db()

        self.assertEqual(doc.date, date)
        self.assertEqual(doc.succeeded, 2)
        self.assertEqual(doc.failed, 1)
        self.assertEqual(doc.log_entries, 3)

    def test_load_isolated_per_date(self):
        other_date = "2024-03-03"
        self._insert_detail(other_date, "Success")

        target_date = "2024-04-04"
        self.assertFalse(
            frappe.db.exists("Bulk Transaction Log Detail", {"date": target_date}),
            "target date has no rows; rows on another date must not leak in",
        )
        self.assertRaises(frappe.DoesNotExistError, self._make_log_doc(target_date).load_from_db)
