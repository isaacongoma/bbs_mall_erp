from __future__ import annotations


import frappe
from frappe import _, session
from frappe.model.document import Document
from frappe.utils import escape_html, now_datetime

from erpnext.utilities.transaction_base import TransactionBase


class WarrantyClaim(TransactionBase):


    def validate(self):
        self.validate_serial_no()
        if session["user"] != "Guest" and not self.customer:
            frappe.throw(_("Customer is required"))

        if (
            self.status == "Closed"
            and not self.resolution_date
            and frappe.db.get_value("Warranty Claim", self.name, "status") != "Closed"
        ):
            self.resolution_date = now_datetime()

    def validate_serial_no(self):
        if not self.serial_no or not self.item_code:
            return
        serial = frappe.db.get_value("Serial No", self.serial_no, ["serial_no", "item_code"], as_dict=True)
        if serial and serial.item_code != self.item_code:
            frappe.throw(
                _("Serial No {0} does not belong to Item {1}").format(
                    escape_html(serial.serial_no), escape_html(self.item_code)
                )
            )

    def on_cancel(self):
        mv = frappe.qb.DocType("Maintenance Visit")
        mvp = frappe.qb.DocType("Maintenance Visit Purpose")
        visits = (
            frappe.qb.from_(mvp)
            .inner_join(mv)
            .on(mvp.parent == mv.name)
            .select(mv.name)
            .where((mvp.prevdoc_docname == self.name) & (mv.docstatus != 2))
            .limit(500)
            .run()
        )
        if visits:
            lst1 = ",".join(x[0] for x in visits)
            frappe.throw(_("Cancel Material Visit {0} before cancelling this Warranty Claim").format(lst1))
        else:
            self.db_set("status", "Cancelled")

    def on_update(self):
        pass


@frappe.whitelist()
def make_maintenance_visit(source_name: str, target_doc: str | dict | Document | None = None):
    from frappe.model.mapper import get_mapped_doc, map_child_doc

    def _update_links(source_doc, target_doc, source_parent):
        target_doc.prevdoc_doctype = source_parent.doctype
        target_doc.prevdoc_docname = source_parent.name

    mv = frappe.qb.DocType("Maintenance Visit")
    mvp = frappe.qb.DocType("Maintenance Visit Purpose")
    visit = (
        frappe.qb.from_(mv)
        .inner_join(mvp)
        .on(mvp.parent == mv.name)
        .select(mv.name)
        .where(
            (mvp.prevdoc_docname == source_name)
            & (mv.docstatus == 1)
            & (mv.completion_status == "Fully Completed")
        )
        .run()
    )

    if not visit:
        target_doc = get_mapped_doc(
            "Warranty Claim",
            source_name,
            {"Warranty Claim": {"doctype": "Maintenance Visit", "field_map": {}}},
            target_doc,
        )

        source_doc = frappe.get_doc("Warranty Claim", source_name)
        if source_doc.get("item_code"):
            table_map = {"doctype": "Maintenance Visit Purpose", "postprocess": _update_links}
            map_child_doc(source_doc, target_doc, table_map, source_doc)

        return target_doc
