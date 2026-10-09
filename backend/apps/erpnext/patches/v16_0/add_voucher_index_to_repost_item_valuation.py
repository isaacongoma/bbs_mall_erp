import frappe


def execute():
    frappe.db.add_index("Repost Item Valuation", ["voucher_no", "voucher_type", "status"], "voucher_status")
