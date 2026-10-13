import frappe
from frappe import _
from frappe.utils import add_days, cint, flt, getdate, now_datetime, today

from apps.bbs_marketplace.marketplace import commission as commission_rules
from apps.bbs_marketplace.marketplace import wallet
from apps.bbs_marketplace.marketplace.utils import get_settings


def setting_account(field):
    account = get_settings().get(field)
    if not account:
        label = frappe.get_meta("Marketplace Settings").get_label(field)
        frappe.throw(_("Set {0} in Marketplace Settings first").format(label))
    return account


def make_journal(company, posting_date, rows, remark, reference):
    debit = flt(sum(flt(row.get("debit_in_account_currency")) for row in rows), 2)
    credit = flt(sum(flt(row.get("credit_in_account_currency")) for row in rows), 2)
    if abs(debit - credit) > 0.005:
        frappe.throw(_("Journal does not balance for {0}: debit {1}, credit {2}").format(reference, debit, credit))
    entry = frappe.new_doc("Journal Entry")
    entry.voucher_type = "Journal Entry"
    entry.company = company
    entry.posting_date = posting_date
    entry.user_remark = remark
    entry.marketplace_reference = reference
    cost_center = get_settings().cost_center
    for row in rows:
        row = dict(row)
        account_type = frappe.db.get_value("Account", row["account"], "root_type")
        if account_type in ("Income", "Expense") and cost_center:
            row["cost_center"] = cost_center
        entry.append("accounts", row)
    entry.flags.ignore_permissions = True
    entry.insert()
    entry.submit()
    return entry.name


def cancel_journal(name):
    if not name:
        return
    entry = frappe.get_doc("Journal Entry", name)
    if entry.docstatus == 1:
        entry.flags.ignore_permissions = True
        entry.cancel()


def receipts_account(order):
    if order.payment_method == "Cash on Delivery":
        for row in get_settings().payment_methods:
            if row.method == "Cash on Delivery" and row.clearing_account:
                return row.clearing_account, False
        frappe.throw(_("Set a clearing account for Cash on Delivery in Marketplace Settings"))
    return setting_account("customer_advance_account"), True


def method_row(method):
    for row in get_settings().payment_methods:
        if row.method == method:
            return row
    return None


def record_payment_entry(payment):
    settings = get_settings()
    order = frappe.get_doc("Marketplace Order", payment.marketplace_order)
    row = method_row(payment.method)
    if not row or not row.clearing_account:
        frappe.throw(_("No clearing account is set for {0} in Marketplace Settings").format(payment.method))
    entry = frappe.new_doc("Payment Entry")
    entry.payment_type = "Receive"
    entry.company = settings.company
    entry.posting_date = today()
    entry.mode_of_payment = row.mode_of_payment
    entry.party_type = "Customer"
    entry.party = order.customer
    entry.paid_from = setting_account("customer_advance_account")
    entry.paid_to = row.clearing_account
    entry.paid_amount = flt(payment.amount)
    entry.received_amount = flt(payment.amount)
    entry.reference_no = payment.gateway_receipt or payment.name
    entry.reference_date = today()
    entry.remarks = _("Marketplace order {0}, payment {1}").format(order.name, payment.name)
    entry.flags.ignore_permissions = True
    entry.insert()
    entry.submit()
    frappe.db.set_value("Marketplace Payment", payment.name, "payment_entry", entry.name, update_modified=False)
    return entry.name


def refund_buyer(order_name, amount, method="M-Pesa", remark=None):
    settings = get_settings()
    order = frappe.get_doc("Marketplace Order", order_name)
    row = method_row(method) or method_row("M-Pesa")
    if not row or not row.clearing_account:
        frappe.throw(_("No clearing account is set for refunds by {0}").format(method))
    entry = frappe.new_doc("Payment Entry")
    entry.payment_type = "Pay"
    entry.company = settings.company
    entry.posting_date = today()
    entry.mode_of_payment = row.mode_of_payment
    entry.party_type = "Customer"
    entry.party = order.customer
    entry.paid_from = row.clearing_account
    entry.paid_to = setting_account("customer_advance_account")
    entry.paid_amount = flt(amount)
    entry.received_amount = flt(amount)
    entry.reference_no = order.name
    entry.reference_date = today()
    entry.remarks = remark or _("Refund for marketplace order {0}").format(order.name)
    entry.flags.ignore_permissions = True
    entry.insert()
    entry.submit()
    return entry.name


def settlement_figures(seller_order):
    so = seller_order
    order = frappe.get_doc("Marketplace Order", so.marketplace_order)
    settings = get_settings()
    vat_rate = flt(settings.commission_vat_rate)
    items_paid = flt(sum(flt(row.amount) for row in so.items), 2)
    platform_discount = flt(so.platform_discount, 2)
    commission = flt(sum(flt(row.commission) for row in so.items), 2)
    commission_vat = flt(commission * vat_rate / 100.0, 2)
    seller_gross = flt(items_paid + platform_discount, 2)
    seller_net = flt(seller_gross - commission - commission_vat - flt(so.shipping_subsidy), 2)
    charged = flt(so.shipping_fee, 2)
    subsidy = flt(so.shipping_subsidy, 2)
    shipping = flt(charged + subsidy, 2)
    shipping_vat = flt(shipping * flt(settings.default_vat_rate) / (100.0 + flt(settings.default_vat_rate)), 2) if shipping else 0.0
    return {
        "order": order,
        "items_paid": items_paid,
        "platform_discount": platform_discount,
        "commission": commission,
        "commission_vat": commission_vat,
        "seller_gross": seller_gross,
        "seller_net": seller_net,
        "shipping": shipping,
        "shipping_charged": charged,
        "shipping_vat": shipping_vat,
        "shipping_income": flt(shipping - shipping_vat, 2),
    }


def settle_seller_order(seller_order_name):
    so = frappe.get_doc("Seller Order", seller_order_name)
    if so.settlement_status in ("Held", "Settled"):
        return so.journal_entry
    settings = get_settings()
    figures = settlement_figures(so)
    order = figures["order"]
    supplier = frappe.db.get_value("Marketplace Seller", so.seller, "supplier")
    if not supplier:
        frappe.throw(_("Seller {0} has no wallet supplier").format(so.seller))
    receipts, is_party_account = receipts_account(order)
    debit_buyer = flt(figures["items_paid"] + figures["shipping_charged"], 2)
    rows = []
    debit = {"account": receipts, "debit_in_account_currency": debit_buyer}
    if is_party_account:
        debit.update({"party_type": "Customer", "party": order.customer})
    rows.append(debit)
    if figures["platform_discount"]:
        rows.append({"account": setting_account("marketing_expense_account"), "debit_in_account_currency": figures["platform_discount"]})
    rows.append(
        {
            "account": setting_account("seller_wallet_account"),
            "party_type": "Supplier",
            "party": supplier,
            "credit_in_account_currency": figures["seller_net"],
        }
    )
    if figures["commission"]:
        rows.append({"account": setting_account("commission_income_account"), "credit_in_account_currency": figures["commission"]})
    if figures["commission_vat"] + figures["shipping_vat"]:
        rows.append({"account": setting_account("output_vat_account"), "credit_in_account_currency": flt(figures["commission_vat"] + figures["shipping_vat"], 2)})
    if figures["shipping_income"]:
        rows.append({"account": setting_account("shipping_income_account"), "credit_in_account_currency": figures["shipping_income"]})
    journal = make_journal(
        settings.company,
        today(),
        rows,
        _("Settlement of seller order {0} ({1}) for marketplace order {2}").format(so.name, so.seller, order.name),
        so.name,
    )
    hold_days = cint(settings.hold_days_after_delivery)
    release_on = add_days(today(), hold_days)
    status = "Held" if hold_days else "Available"
    txn = wallet.post_transaction(
        so.seller,
        "Sale",
        figures["seller_net"],
        status=status,
        available_on=release_on,
        reference=("Seller Order", so.name),
        journal_entry=journal,
        remarks=_("Order {0}: items {1}, commission {2}, VAT on commission {3}").format(order.name, figures["seller_gross"], figures["commission"], figures["commission_vat"]),
    )
    frappe.db.set_value(
        "Seller Order",
        so.name,
        {
            "settlement_status": "Held" if hold_days else "Settled",
            "settle_on": release_on,
            "settled_on": now_datetime(),
            "journal_entry": journal,
            "wallet_transaction": txn.name,
            "commission_amount": figures["commission"],
            "commission_vat": figures["commission_vat"],
            "seller_net": figures["seller_net"],
        },
        update_modified=False,
    )
    return journal


def reverse_settlement_portion(seller_order_name, refund_gross, commission_back, vat_back, platform_back=0.0, reference=None):
    so = frappe.get_doc("Seller Order", seller_order_name)
    if not so.journal_entry:
        return None
    settings = get_settings()
    order = frappe.get_doc("Marketplace Order", so.marketplace_order)
    supplier = frappe.db.get_value("Marketplace Seller", so.seller, "supplier")
    receipts, is_party_account = receipts_account(order)
    seller_share = flt(refund_gross + platform_back - commission_back - vat_back, 2)
    rows = [
        {"account": setting_account("seller_wallet_account"), "party_type": "Supplier", "party": supplier, "debit_in_account_currency": seller_share},
    ]
    if commission_back:
        rows.append({"account": setting_account("commission_income_account"), "debit_in_account_currency": flt(commission_back, 2)})
    if vat_back:
        rows.append({"account": setting_account("output_vat_account"), "debit_in_account_currency": flt(vat_back, 2)})
    credit = {"account": receipts, "credit_in_account_currency": flt(refund_gross, 2)}
    if is_party_account:
        credit.update({"party_type": "Customer", "party": order.customer})
    rows.append(credit)
    if platform_back:
        rows.append({"account": setting_account("marketing_expense_account"), "credit_in_account_currency": flt(platform_back, 2)})
    journal = make_journal(settings.company, today(), rows, _("Return reversal for seller order {0}").format(so.name), reference or so.name)
    held = frappe.db.get_value("Seller Wallet Transaction", so.wallet_transaction, "status") == "Held"
    wallet.post_transaction(
        so.seller,
        "Refund Reversal",
        -seller_share,
        status="Held" if held else "Posted",
        available_on=so.settle_on if held else None,
        reference=("Seller Order", so.name),
        journal_entry=journal,
        remarks=_("Returned goods on order {0}").format(so.marketplace_order),
    )
    return journal


def hold_withdrawal(withdrawal):
    settings = get_settings()
    supplier = frappe.db.get_value("Marketplace Seller", withdrawal.seller, "supplier")
    rows = [
        {"account": setting_account("seller_wallet_account"), "party_type": "Supplier", "party": supplier, "debit_in_account_currency": flt(withdrawal.amount, 2)},
        {"account": setting_account("payouts_in_transit_account"), "credit_in_account_currency": flt(withdrawal.net_amount, 2)},
    ]
    if flt(withdrawal.fee):
        rows.append({"account": setting_account("withdrawal_fee_account"), "credit_in_account_currency": flt(withdrawal.fee, 2)})
    return make_journal(settings.company, today(), rows, _("Withdrawal {0} by {1}").format(withdrawal.name, withdrawal.seller), withdrawal.name)


def pay_withdrawal(withdrawal):
    settings = get_settings()
    rows = [
        {"account": setting_account("payouts_in_transit_account"), "debit_in_account_currency": flt(withdrawal.net_amount, 2)},
        {"account": setting_account("payout_bank_account"), "credit_in_account_currency": flt(withdrawal.net_amount, 2)},
    ]
    return make_journal(settings.company, today(), rows, _("Payout of withdrawal {0} to {1}").format(withdrawal.name, withdrawal.seller), withdrawal.name)


def post_bill_payment(doc):
    settings = get_settings()
    supplier = frappe.db.get_value("Marketplace Seller", doc.seller, "supplier")
    customer = frappe.db.get_value("Marketplace Seller", doc.seller, "customer")
    receivable = frappe.get_cached_value("Company", doc.company, "default_receivable_account")
    rows = [
        {"account": setting_account("seller_wallet_account"), "party_type": "Supplier", "party": supplier, "debit_in_account_currency": flt(doc.total_amount, 2)},
    ]
    for line in doc.invoices:
        invoice_account = frappe.db.get_value("Sales Invoice", line.sales_invoice, "debit_to") or receivable
        rows.append(
            {
                "account": invoice_account,
                "party_type": "Customer",
                "party": customer,
                "credit_in_account_currency": flt(line.allocated_amount, 2),
                "reference_type": "Sales Invoice",
                "reference_name": line.sales_invoice,
            }
        )
    return make_journal(doc.company, doc.posting_date, rows, _("Wallet payment of bills by {0}").format(doc.seller), doc.name)


def on_payment_entry(doc, method=None):
    return None


def post_service_charge(seller, income_field, net, vat, remark, reference):
    settings = get_settings()
    supplier = frappe.db.get_value("Marketplace Seller", seller, "supplier")
    total = flt(flt(net) + flt(vat), 2)
    rows = [
        {"account": setting_account("seller_wallet_account"), "party_type": "Supplier", "party": supplier, "debit_in_account_currency": total},
        {"account": setting_account(income_field), "credit_in_account_currency": flt(net, 2)},
    ]
    if flt(vat):
        rows.append({"account": setting_account("output_vat_account"), "credit_in_account_currency": flt(vat, 2)})
    return make_journal(settings.company, today(), rows, remark, reference)
