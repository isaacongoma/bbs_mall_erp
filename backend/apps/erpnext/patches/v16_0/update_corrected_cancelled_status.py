import frappe


def execute():
    stock_closing_entry = frappe.qb.DocType("Stock Closing Entry")
    call_log = frappe.qb.DocType("Call Log")

    (
        frappe.qb.update(stock_closing_entry)
        .set(stock_closing_entry.status, "Cancelled")
        .where(stock_closing_entry.status == "Canceled")
    ).run()

    (frappe.qb.update(call_log).set(call_log.status, "Cancelled").where(call_log.status == "Canceled")).run()
