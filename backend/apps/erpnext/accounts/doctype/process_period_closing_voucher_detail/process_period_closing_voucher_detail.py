import frappe
from frappe.model.document import Document


class ProcessPeriodClosingVoucherDetail(Document):


    doctype = 'Process Period Closing Voucher Detail'

    pass


def on_doctype_update():
    frappe.db.add_index(
        "Process Period Closing Voucher Detail",
        ["parent", "status", "parentfield", "idx", "processing_date"],
    )
