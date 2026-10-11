import frappe
from frappe import _
from frappe.utils import add_days, cint, flt, getdate, now_datetime, today

from apps.bbs_marketplace.marketplace.utils import get_settings


def wallet_account():
    account = get_settings().seller_wallet_account
    if not account:
        frappe.throw(_("Set the Seller Wallet Payable account in Marketplace Settings"))
    return account


def gl_balance(seller):
    supplier = frappe.db.get_value("Marketplace Seller", seller, "supplier")
    if not supplier:
        return 0.0
    row = frappe.db.sql(
        'select coalesce(sum(credit - debit), 0) from "tabGL Entry" where account = %s and party_type = \'Supplier\' and party = %s and is_cancelled = 0',
        (wallet_account(), supplier),
    )
    return flt(row[0][0], 2)


def held_amount(seller):
    row = frappe.db.sql(
        'select coalesce(sum(amount), 0) from "tabSeller Wallet Transaction" where seller = %s and status = \'Held\'',
        seller,
    )
    return max(0.0, flt(row[0][0], 2))


def balances(seller):
    total = gl_balance(seller)
    held = min(held_amount(seller), max(0.0, total))
    return {"balance": total, "pending": held, "available": max(0.0, flt(total - held, 2))}


def refresh_seller_balances(seller):
    values = balances(seller)
    frappe.db.set_value(
        "Marketplace Seller",
        seller,
        {"wallet_balance": values["balance"], "pending_balance": values["pending"], "available_balance": values["available"]},
        update_modified=False,
    )
    return values


def post_transaction(seller, transaction_type, amount, status="Posted", available_on=None, reference=None, journal_entry=None, remarks=None):
    balance = gl_balance(seller)
    doc = frappe.get_doc(
        {
            "doctype": "Seller Wallet Transaction",
            "seller": seller,
            "posting_date": now_datetime(),
            "transaction_type": transaction_type,
            "amount": flt(amount, 2),
            "status": status,
            "available_on": available_on,
            "balance_after": balance,
            "reference_doctype": reference[0] if reference else None,
            "reference_name": reference[1] if reference else None,
            "journal_entry": journal_entry,
            "remarks": remarks,
        }
    )
    doc.flags.ignore_permissions = True
    doc.insert()
    refresh_seller_balances(seller)
    return doc


def release_due_holds(on_date=None):
    on_date = getdate(on_date or today())
    rows = frappe.get_all(
        "Seller Wallet Transaction",
        filters={"status": "Held", "available_on": ["<=", on_date]},
        fields=["name", "seller"],
    )
    sellers = set()
    for row in rows:
        frappe.db.set_value("Seller Wallet Transaction", row.name, {"status": "Available", "released_on": now_datetime()}, update_modified=False)
        sellers.add(row.seller)
    for seller in sellers:
        refresh_seller_balances(seller)
    return len(rows)


def require_available(seller, amount):
    values = balances(seller)
    if flt(amount) > values["available"] + 0.004:
        frappe.throw(
            _("Insufficient available balance. Available {0}, pending {1}").format(
                frappe.format_value(values["available"], {"fieldtype": "Currency"}),
                frappe.format_value(values["pending"], {"fieldtype": "Currency"}),
            )
        )
    return values
