import frappe
from frappe import _dict
from frappe.utils import add_days, nowdate, random_string

from erpnext.stock.doctype.delivery_note.test_delivery_note import create_delivery_note
from erpnext.stock.doctype.item.test_item import make_item
from erpnext.stock.doctype.purchase_receipt.test_purchase_receipt import make_purchase_receipt
from erpnext.stock.doctype.serial_and_batch_bundle.test_serial_and_batch_bundle import (
    get_batch_from_bundle,
    get_serial_nos_from_bundle,
)
from erpnext.stock.doctype.serial_no.serial_no import *
from erpnext.stock.doctype.serial_no.serial_no import update_maintenance_status
from erpnext.stock.doctype.stock_entry.stock_entry_utils import make_stock_entry
from erpnext.stock.doctype.stock_entry.test_stock_entry import make_serialized_item
from erpnext.stock.doctype.warehouse.test_warehouse import create_warehouse
from erpnext.tests.utils import ERPNextTestSuite


class TestSerialNo(ERPNextTestSuite):
    def setUp(self):
        self.load_test_records("Stock Entry")

    def test_cannot_create_direct(self):
        frappe.delete_doc_if_exists("Serial No", "_TCSER0001")

        sr = frappe.new_doc("Serial No")
        sr.item_code = "_Test Serialized Item"
        sr.warehouse = "_Test Warehouse - _TC"
        sr.serial_no = "_TCSER0001"
        sr.purchase_rate = 10
        sr.company = "_Test Company"
        self.assertRaises(SerialNoCannotCreateDirectError, sr.insert)

        sr.warehouse = None
        sr.insert()
        self.assertTrue(sr.name)

        sr.warehouse = "_Test Warehouse - _TC"
        self.assertTrue(SerialNoCannotCannotChangeError, sr.save)

    def test_inter_company_transfer(self):
        se = make_serialized_item(self, target_warehouse="_Test Warehouse - _TC")
        serial_nos = get_serial_nos_from_bundle(se.get("items")[0].serial_and_batch_bundle)

        create_delivery_note(item_code="_Test Serialized Item With Series", qty=1, serial_no=[serial_nos[0]])

        serial_no = frappe.get_doc("Serial No", serial_nos[0])

        self.assertEqual(serial_no.warehouse, None)

        wh = create_warehouse("_Test Warehouse", company="_Test Company 1")
        make_purchase_receipt(
            item_code="_Test Serialized Item With Series",
            qty=1,
            serial_no=[serial_nos[0]],
            company="_Test Company 1",
            warehouse=wh,
        )

        serial_no.reload()

        self.assertEqual(serial_no.warehouse, wh)

    def test_inter_company_transfer_intermediate_cancellation(self):
        """
        Receive into and Deliver Serial No from one company.
        Then Receive into and Deliver from second company.
        Try to cancel intermediate receipts/deliveries to test if it is blocked.
        """
        se = make_serialized_item(self, target_warehouse="_Test Warehouse - _TC")
        serial_nos = get_serial_nos_from_bundle(se.get("items")[0].serial_and_batch_bundle)

        sn_doc = frappe.get_doc("Serial No", serial_nos[0])

        self.assertEqual(sn_doc.warehouse, "_Test Warehouse - _TC")

        dn = create_delivery_note(
            item_code="_Test Serialized Item With Series", qty=1, serial_no=[serial_nos[0]]
        )
        sn_doc.reload()
        self.assertEqual(sn_doc.warehouse, None)

        self.assertRaises(frappe.ValidationError, se.cancel)

        wh = create_warehouse("_Test Warehouse", company="_Test Company 1")
        pr = make_purchase_receipt(
            item_code="_Test Serialized Item With Series",
            qty=1,
            serial_no=[serial_nos[0]],
            company="_Test Company 1",
            warehouse=wh,
        )
        sn_doc.reload()

        self.assertEqual(sn_doc.warehouse, wh)
        self.assertRaises(frappe.ValidationError, dn.cancel)

        create_delivery_note(
            item_code="_Test Serialized Item With Series",
            qty=1,
            serial_no=[serial_nos[0]],
            company="_Test Company 1",
            warehouse=wh,
            cost_center="_Test Company 1 - _TC1",
        )
        sn_doc.reload()

        self.assertEqual(sn_doc.warehouse, None)

        self.assertRaises(frappe.ValidationError, se.cancel)
        self.assertRaises(frappe.ValidationError, dn.cancel)
        self.assertRaises(frappe.ValidationError, pr.cancel)

    def test_inter_company_transfer_fallback_on_cancel(self):
        """
        Test Serial No state changes on cancellation.
        If Delivery cancelled, it should fall back on last Receipt in the same company.
        If Receipt is cancelled, it should be Inactive in the same company.
        """
        se = make_serialized_item(self, target_warehouse="_Test Warehouse - _TC")
        serial_nos = get_serial_nos_from_bundle(se.get("items")[0].serial_and_batch_bundle)
        sn_doc = frappe.get_doc("Serial No", serial_nos[0])

        dn = create_delivery_note(
            item_code="_Test Serialized Item With Series", qty=1, serial_no=[serial_nos[0]]
        )

        wh = create_warehouse("_Test Warehouse", company="_Test Company 1")
        pr = make_purchase_receipt(
            item_code="_Test Serialized Item With Series",
            qty=1,
            serial_no=[serial_nos[0]],
            company="_Test Company 1",
            warehouse=wh,
            cost_center="_Test Company 1 - _TC1",
        )

        dn_2 = create_delivery_note(
            item_code="_Test Serialized Item With Series",
            qty=1,
            serial_no=[serial_nos[0]],
            company="_Test Company 1",
            warehouse=wh,
            cost_center="_Test Company 1 - _TC1",
        )
        sn_doc.reload()

        self.assertEqual(sn_doc.warehouse, None)

        dn_2.cancel()
        sn_doc.reload()
        self.assertEqual(sn_doc.warehouse, wh)

        pr.cancel()
        sn_doc.reload()
        self.assertEqual(sn_doc.warehouse, None)

        dn.cancel()
        sn_doc.reload()
        self.assertEqual(sn_doc.warehouse, "_Test Warehouse - _TC")

    def test_correct_serial_no_incoming_rate(self):
        """Check correct consumption rate based on serial no record."""
        item_code = "_Test Serialized Item"
        warehouse = "_Test Warehouse - _TC"
        serial_nos = ["LOWVALUATION", "HIGHVALUATION"]

        for serial_no in serial_nos:
            if not frappe.db.exists("Serial No", {"item_code": item_code, "serial_no": serial_no}):
                frappe.get_doc(
                    {
                        "doctype": "Serial No",
                        "item_code": item_code,
                        "serial_no": serial_no,
                        "company": "_Test Company",
                    }
                ).insert()

        serial_nos = [
            frappe.db.get_value("Serial No", {"item_code": item_code, "serial_no": number}, "name")
            for number in serial_nos
        ]

        make_stock_entry(
            item_code=item_code, to_warehouse=warehouse, qty=1, rate=42, serial_no=[serial_nos[0]]
        )
        make_stock_entry(
            item_code=item_code, to_warehouse=warehouse, qty=1, rate=113, serial_no=[serial_nos[1]]
        )

        out = create_delivery_note(item_code=item_code, qty=1, serial_no=[serial_nos[0]], do_not_submit=True)

        bundle = out.items[0].serial_and_batch_bundle
        doc = frappe.get_doc("Serial and Batch Bundle", bundle)
        doc.entries[0].serial_no = serial_nos[1]
        doc.save()

        out.save()
        out.submit()

        value_diff = frappe.db.get_value(
            "Stock Ledger Entry",
            {"voucher_no": out.name, "voucher_type": "Delivery Note"},
            "stock_value_difference",
        )
        self.assertEqual(value_diff, -113)

    def test_auto_fetch(self):
        item_code = make_item(
            properties={
                "has_serial_no": 1,
                "has_batch_no": 1,
                "create_new_batch": 1,
                "serial_no_series": "TEST.#######",
            }
        ).name
        warehouse = "_Test Warehouse - _TC"

        in1 = make_stock_entry(item_code=item_code, to_warehouse=warehouse, qty=5)
        in2 = make_stock_entry(item_code=item_code, to_warehouse=warehouse, qty=5)

        in1.reload()
        in2.reload()

        batch1 = get_batch_from_bundle(in1.items[0].serial_and_batch_bundle)
        batch2 = get_batch_from_bundle(in2.items[0].serial_and_batch_bundle)

        batch_wise_serials = {
            batch1: get_serial_nos_from_bundle(in1.items[0].serial_and_batch_bundle),
            batch2: get_serial_nos_from_bundle(in2.items[0].serial_and_batch_bundle),
        }

        first_fetch = get_auto_serial_nos(
            _dict(
                {
                    "qty": 5,
                    "item_code": item_code,
                    "warehouse": warehouse,
                }
            )
        )

        self.assertEqual(first_fetch, batch_wise_serials[batch1])

        partial_fetch = get_auto_serial_nos(
            _dict(
                {
                    "qty": 2,
                    "item_code": item_code,
                    "warehouse": warehouse,
                }
            )
        )

        self.assertTrue(
            set(partial_fetch).issubset(set(first_fetch)),
            msg=f"{partial_fetch} should be subset of {first_fetch}",
        )

        remaining = get_auto_serial_nos(
            _dict(
                {
                    "qty": 3,
                    "item_code": item_code,
                    "warehouse": warehouse,
                    "ignore_serial_nos": partial_fetch,
                }
            )
        )

        self.assertEqual(sorted(remaining + partial_fetch), first_fetch)

        for batch, expected_serials in batch_wise_serials.items():
            fetched_sr = get_auto_serial_nos(
                _dict({"qty": 5, "item_code": item_code, "warehouse": warehouse, "batches": [batch]})
            )

            self.assertEqual(fetched_sr, sorted(expected_serials))

        self.assertFalse(
            get_auto_serial_nos(
                _dict({"qty": 10, "item_code": item_code, "warehouse": "Non Existing Warehouse"})
            )
        )

        all_serials = [sr for sr_list in batch_wise_serials.values() for sr in sr_list]
        fetched_serials = get_auto_serial_nos(
            _dict(
                {
                    "qty": 10,
                    "item_code": item_code,
                    "warehouse": warehouse,
                    "batches": list(batch_wise_serials.keys()),
                }
            )
        )
        self.assertEqual(sorted(all_serials), fetched_serials)

        frappe.db.set_value("Batch", batch1, "expiry_date", "1980-01-01")
        non_expired_serials = get_auto_serial_nos(
            _dict({"qty": 5, "item_code": item_code, "warehouse": warehouse, "batches": [batch1]})
        )

        self.assertEqual(non_expired_serials, [])

    def test_update_maintenance_status_expires_past_warranty(self):
        """update_maintenance_status() must pick up the past-warranty Serial No via or_filters and flip it Out of Warranty."""
        item_code = "_Test Serialized Item"
        past_date = add_days(nowdate(), -10)
        future_date = add_days(nowdate(), 10)

        expired_sr = frappe.get_doc(
            {
                "doctype": "Serial No",
                "item_code": item_code,
                "serial_no": "_TCWARREXP" + random_string(6),
                "company": "_Test Company",
                "warranty_expiry_date": past_date,
            }
        ).insert()
        frappe.db.set_value("Serial No", expired_sr.name, "maintenance_status", "Under Warranty")
        self.assertEqual(
            frappe.db.get_value("Serial No", expired_sr.name, "maintenance_status"), "Under Warranty"
        )

        active_sr = frappe.get_doc(
            {
                "doctype": "Serial No",
                "item_code": item_code,
                "serial_no": "_TCWARRACT" + random_string(6),
                "company": "_Test Company",
                "warranty_expiry_date": future_date,
            }
        ).insert()
        self.assertEqual(
            frappe.db.get_value("Serial No", active_sr.name, "maintenance_status"), "Under Warranty"
        )

        update_maintenance_status()

        self.assertEqual(
            frappe.db.get_value("Serial No", expired_sr.name, "maintenance_status"), "Out of Warranty"
        )
        self.assertEqual(
            frappe.db.get_value("Serial No", active_sr.name, "maintenance_status"), "Under Warranty"
        )

    def test_update_maintenance_status_excludes_out_of_amc(self):
        """The `not in [Out of Warranty, Out of AMC]` filter must skip rows already pinned to
        those statuses, even when they match the expiry or_filters, while rows in any other
        status ARE re-evaluated. The contrast makes the `not in` clause load-bearing."""
        item_code = "_Test Serialized Item"
        past_date = add_days(nowdate(), -10)
        future_date = add_days(nowdate(), 10)

        excluded_sr = frappe.get_doc(
            {
                "doctype": "Serial No",
                "item_code": item_code,
                "serial_no": "_TCAMCEXCL" + random_string(6),
                "company": "_Test Company",
                "amc_expiry_date": past_date,
                "warranty_expiry_date": future_date,
            }
        ).insert()
        frappe.db.set_value("Serial No", excluded_sr.name, "maintenance_status", "Out of AMC")

        candidate_sr = frappe.get_doc(
            {
                "doctype": "Serial No",
                "item_code": item_code,
                "serial_no": "_TCAMCCAND" + random_string(6),
                "company": "_Test Company",
                "amc_expiry_date": past_date,
            }
        ).insert()
        frappe.db.set_value("Serial No", candidate_sr.name, "maintenance_status", "Under AMC")

        update_maintenance_status()

        self.assertEqual(
            frappe.db.get_value("Serial No", excluded_sr.name, "maintenance_status"), "Out of AMC"
        )
        self.assertEqual(
            frappe.db.get_value("Serial No", candidate_sr.name, "maintenance_status"), "Out of AMC"
        )

    def test_update_maintenance_status_includes_null_status(self):
        """Converting the raw `maintenance_status not in (...)` to a get_all filter changes NULL
        handling: frappe wraps the clause as `ifnull(maintenance_status, '') not in (...)`, so a
        NULL-status row that matches the expiry or_filters is now re-evaluated (consistently on
        MariaDB and Postgres). Pin that contract."""
        item_code = "_Test Serialized Item"
        past_date = add_days(nowdate(), -10)

        null_sr = frappe.get_doc(
            {
                "doctype": "Serial No",
                "item_code": item_code,
                "serial_no": "_TCAMCNULL" + random_string(6),
                "company": "_Test Company",
                "amc_expiry_date": past_date,
            }
        ).insert()
        frappe.db.set_value("Serial No", null_sr.name, "maintenance_status", None)
        self.assertIsNone(frappe.db.get_value("Serial No", null_sr.name, "maintenance_status"))

        update_maintenance_status()

        self.assertEqual(frappe.db.get_value("Serial No", null_sr.name, "maintenance_status"), "Out of AMC")


def get_auto_serial_nos(kwargs):
    from erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle import (
        get_available_serial_nos,
    )

    serial_nos = get_available_serial_nos(kwargs)
    return sorted([d.serial_no for d in serial_nos])
