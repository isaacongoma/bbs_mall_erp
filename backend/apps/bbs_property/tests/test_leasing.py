import frappe
from frappe.utils import add_days, add_months, flt, getdate, nowdate

from apps.bbs_property.property_management import billing
from apps.bbs_property.tests.base import PropertyTestCase


class TestLeasing(PropertyTestCase):
    def test_unit_naming_and_metrics(self):
        unit = self.make_unit("A01", area=40, rent=80000)
        self.assertEqual(unit, "TM-A01")
        row = frappe.get_doc("Property", self.property)
        row.run_method("onload")
        self.assertEqual(row.get_onload("metrics")["total_units"], 1)
        self.assertEqual(row.get_onload("metrics")["vacant_units"], 1)

    def test_submit_marks_unit_occupied_and_builds_schedule(self):
        unit = self.make_unit("B01", rent=100000, service=5000)
        lease = self.make_lease(
            [unit],
            rent_free_months=1,
            escalation_type="Percentage",
            escalation_rate=10,
            escalation_months=12,
            months=24,
        )
        self.assertEqual(lease.status, "Active")
        row = frappe.db.get_value("Rentable Unit", unit, ["status", "current_tenant", "current_lease"], as_dict=True)
        self.assertEqual(row.status, "Occupied")
        self.assertEqual(row.current_lease, lease.name)
        schedule = frappe.get_all("Lease Rent Schedule", filters={"parent": lease.name}, fields=["monthly_rent", "note"], order_by="from_date asc")
        self.assertEqual([flt(r.monthly_rent) for r in schedule], [0.0, 100000.0, 110000.0])
        self.assertEqual(frappe.db.get_value("Property", self.property, "occupied_units"), 1)

    def test_overlapping_lease_is_rejected(self):
        unit = self.make_unit("C01")
        self.make_lease([unit])
        other = self.make_customer("_Test Tenant 2")
        with self.assertRaises(frappe.ValidationError):
            self.make_lease([unit], customer=other)

    def test_billing_creates_invoice_with_rent_and_service(self):
        unit = self.make_unit("D01", rent=100000, service=10000)
        lease = self.make_lease([unit], start=add_days(nowdate(), -3))
        run = frappe.get_doc({"doctype": "Lease Billing Run", "company": self.company, "property": self.property, "run_date": nowdate()})
        run.insert()
        self.assertEqual(run.leases_found, 1)
        run.submit()
        run.reload()
        self.assertEqual(run.status, "Completed")
        self.assertEqual(run.invoices_created, 1)
        invoice = frappe.get_doc("Sales Invoice", run.items[0].sales_invoice)
        self.assertEqual(invoice.lease, lease.name)
        self.assertEqual(flt(invoice.grand_total), 110000)
        self.assertEqual(invoice.docstatus, 1)
        lease.reload()
        self.assertEqual(flt(lease.total_billed), 110000)
        self.assertEqual(flt(lease.outstanding_amount), 110000)
        self.assertEqual(getdate(lease.next_billing_date), add_months(getdate(lease.start_date), 1))
        again = billing.make_lease_invoice(lease, lease.start_date, add_days(add_months(getdate(lease.start_date), 1), -1))
        self.assertIsNone(again)

    def test_payment_reduces_outstanding(self):
        unit = self.make_unit("E01", rent=50000, service=0)
        lease = self.make_lease([unit])
        invoice = billing.make_lease_invoice(lease, lease.start_date, add_days(add_months(getdate(lease.start_date), 1), -1))
        from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry

        entry = get_payment_entry("Sales Invoice", invoice.name, bank_account="_Test Bank - _TC")
        entry.reference_no = "TEST"
        entry.reference_date = nowdate()
        entry.insert()
        entry.submit()
        lease.reload()
        self.assertEqual(flt(lease.outstanding_amount), 0)
        self.assertEqual(flt(lease.total_paid), 50000)

    def test_late_fee_charged_once_per_month(self):
        unit = self.make_unit("F01", rent=100000, service=0)
        lease = self.make_lease([unit], start=add_days(nowdate(), -60))
        invoice = billing.make_lease_invoice(lease, lease.start_date, add_days(add_months(getdate(lease.start_date), 1), -1), posting_date=add_days(nowdate(), -40))
        created = billing.apply_late_fees()
        self.assertEqual(created, 1)
        fee = frappe.db.get_value("Sales Invoice", {"late_fee_for": invoice.name}, ["grand_total", "late_fee_period"], as_dict=True)
        self.assertEqual(flt(fee.grand_total), 10000)
        self.assertEqual(billing.apply_late_fees(), 0)

    def test_termination_frees_unit(self):
        unit = self.make_unit("G02")
        lease = self.make_lease([unit])
        lease.terminate(nowdate(), "Mutual Agreement", "Moving out")
        self.assertEqual(frappe.db.get_value("Rentable Unit", unit, "status"), "Vacant")
        self.assertEqual(frappe.db.get_value("Lease Agreement", lease.name, "status"), "Terminated")

    def test_renewal_applies_escalation(self):
        unit = self.make_unit("H01", rent=100000)
        lease = self.make_lease([unit], escalation_type="Percentage", escalation_rate=5, escalation_months=12)
        renewal = lease.make_renewal()
        self.assertEqual(renewal["lease_type"], "Renewal")
        self.assertEqual(renewal["units"][0]["monthly_rent"], 105000)

    def test_deposit_receipt_and_refund(self):
        unit = self.make_unit("I01")
        lease = self.make_lease([unit], security_deposit_amount=200000)
        receipt = frappe.get_doc(
            {"doctype": "Lease Deposit", "lease": lease.name, "transaction_type": "Receipt", "amount": 200000, "bank_account": "_Test Bank - _TC", "posting_date": nowdate()}
        )
        receipt.insert()
        receipt.submit()
        lease.reload()
        self.assertEqual(flt(lease.deposit_balance), 200000)
        self.assertTrue(receipt.journal_entry)
        refund = frappe.get_doc(
            {"doctype": "Lease Deposit", "lease": lease.name, "transaction_type": "Refund", "amount": 150000, "bank_account": "_Test Bank - _TC", "posting_date": nowdate()}
        )
        refund.insert()
        refund.submit()
        lease.reload()
        self.assertEqual(flt(lease.deposit_balance), 50000)
        too_much = frappe.get_doc(
            {"doctype": "Lease Deposit", "lease": lease.name, "transaction_type": "Refund", "amount": 60000, "bank_account": "_Test Bank - _TC", "posting_date": nowdate()}
        )
        with self.assertRaises(frappe.ValidationError):
            too_much.insert()
