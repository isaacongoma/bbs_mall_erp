import frappe
from frappe.model.document import Document
from frappe.query_builder.functions import Sum


class SubcontractingInwardOrderItem(Document):


    doctype = 'Subcontracting Inward Order Item'

    pass

    def update_manufacturing_qty_fields(self):
        table = frappe.qb.DocType("Work Order")
        query = (
            frappe.qb.from_(table)
            .select(
                Sum(table.produced_qty).as_("produced_qty"),
                Sum(table.process_loss_qty).as_("process_loss_qty"),
            )
            .where((table.subcontracting_inward_order_item == self.name) & (table.docstatus == 1))
        )
        result = query.run(as_dict=True)[0]

        self.db_set("produced_qty", result.produced_qty)
        self.db_set("process_loss_qty", result.process_loss_qty)
