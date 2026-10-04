import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint


class ItemLeadTime(Document):


    doctype = 'Item Lead Time'

    def validate(self):
        self.validate_supplier_lead_times()

    def validate_supplier_lead_times(self):
        suppliers = set()
        default_rows = 0
        for row in self.supplier_lead_times:
            if row.supplier in suppliers:
                frappe.throw(
                    _("Row #{0}: Supplier {1} is already added in the Supplier Lead Times table").format(
                        row.idx, frappe.bold(row.supplier)
                    )
                )
            suppliers.add(row.supplier)
            default_rows += cint(row.is_default)

        if default_rows > 1:
            frappe.throw(_("Only one supplier can be marked as default in the Supplier Lead Times table"))
