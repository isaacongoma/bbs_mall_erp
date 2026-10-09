import frappe


def execute():

    ExpenseClaim = frappe.qb.DocType("Expense Claim")

    (
        frappe.qb.update(ExpenseClaim)
        .set(ExpenseClaim.status, "Paid")
        .where(
            (
                (ExpenseClaim.grand_total == 0)
                | (ExpenseClaim.grand_total == ExpenseClaim.total_amount_reimbursed)
            )
            & (ExpenseClaim.approval_status == "Approved")
            & (ExpenseClaim.docstatus == 1)
            & (ExpenseClaim.total_sanctioned_amount > 0)
        )
    ).run()
