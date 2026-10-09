import frappe
from frappe.utils.data import today

from erpnext.support.doctype.warranty_claim.warranty_claim import make_maintenance_visit
from erpnext.tests.utils import ERPNextTestSuite


class TestWarrantyClaim(ERPNextTestSuite):
    def make_warranty_claim(self):
        claim = frappe.new_doc("Warranty Claim")
        claim.status = "Open"
        claim.complaint_date = today()
        claim.customer = "_Test Customer"
        claim.item_code = "_Test Item"
        claim.complaint = "Device stopped working under warranty"
        claim.company = "_Test Company"
        claim.insert(ignore_permissions=True)
        return claim

    def make_maintenance_visit_for_claim(self, claim, completion_status):
        visit = frappe.new_doc("Maintenance Visit")
        visit.company = "_Test Company"
        visit.customer = "_Test Customer"
        visit.mntc_date = today()
        visit.maintenance_type = "Unscheduled"
        visit.completion_status = completion_status
        visit.append(
            "purposes",
            {
                "item_code": "_Test Item",
                "service_person": "_Test Sales Person",
                "work_done": "Replaced the faulty component",
                "description": "Warranty repair",
                "prevdoc_doctype": "Warranty Claim",
                "prevdoc_docname": claim.name,
            },
        )
        visit.insert(ignore_permissions=True)
        visit.submit()
        return visit

    def test_make_maintenance_visit_maps_new_visit_when_none_completed(self):
        claim = self.make_warranty_claim()

        target = make_maintenance_visit(claim.name)

        self.assertIsNotNone(target)
        self.assertEqual(target.doctype, "Maintenance Visit")
        self.assertTrue(target.is_new())
        self.assertEqual(len(target.purposes), 1)
        row = target.purposes[0]
        self.assertEqual(row.item_code, "_Test Item")
        self.assertEqual(row.prevdoc_doctype, "Warranty Claim")
        self.assertEqual(row.prevdoc_docname, claim.name)

    def test_make_maintenance_visit_returns_none_when_fully_completed_exists(self):
        claim = self.make_warranty_claim()
        visit = self.make_maintenance_visit_for_claim(claim, "Fully Completed")

        self.assertEqual(visit.docstatus, 1)
        self.assertEqual(visit.completion_status, "Fully Completed")
        self.assertEqual(visit.purposes[0].prevdoc_docname, claim.name)

        self.assertIsNone(make_maintenance_visit(claim.name))

    def test_make_maintenance_visit_ignores_partially_completed(self):
        claim = self.make_warranty_claim()
        self.make_maintenance_visit_for_claim(claim, "Partially Completed")

        target = make_maintenance_visit(claim.name)

        self.assertIsNotNone(target)
        self.assertTrue(target.is_new())
        self.assertEqual(target.doctype, "Maintenance Visit")

    def test_on_cancel_blocked_by_active_maintenance_visit(self):
        claim = self.make_warranty_claim()
        self.make_maintenance_visit_for_claim(claim, "Partially Completed")

        self.assertRaises(frappe.ValidationError, claim.on_cancel)

    def test_on_cancel_allowed_when_no_active_visit(self):
        claim = self.make_warranty_claim()

        claim.on_cancel()

        self.assertEqual(frappe.db.get_value("Warranty Claim", claim.name, "status"), "Cancelled")
