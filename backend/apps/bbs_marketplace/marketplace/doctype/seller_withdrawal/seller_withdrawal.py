import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, cint, flt, getdate, now_datetime, today

from apps.bbs_marketplace.marketplace import accounting, mpesa, wallet
from apps.bbs_marketplace.marketplace.utils import get_settings

OPEN = ("Requested", "Pending Approval", "Approved", "Processing")


class SellerWithdrawal(Document):
    doctype = "Seller Withdrawal"

    def validate(self):
        if not self.is_new():
            return
        settings = get_settings()
        seller = frappe.get_doc("Marketplace Seller", self.seller)
        if seller.status != "Active":
            frappe.throw(_("The seller account is not active"))
        if cint(settings.require_kyc_for_withdrawal) and seller.kyc_status != "Verified":
            frappe.throw(_("Complete KYC verification before withdrawing"))
        self.resolve_destination(seller)
        amount = flt(self.amount, 2)
        if amount < flt(settings.min_withdrawal):
            frappe.throw(_("The minimum withdrawal is {0}").format(flt(settings.min_withdrawal)))
        taken_today = flt(
            frappe.db.sql(
                'select coalesce(sum(amount), 0) from "tabSeller Withdrawal" where seller = %s and status not in (\'Failed\', \'Rejected\', \'Cancelled\') and creation >= %s',
                (self.seller, getdate(today())),
            )[0][0]
        )
        if flt(settings.max_withdrawal_per_day) and taken_today + amount > flt(settings.max_withdrawal_per_day):
            frappe.throw(_("The daily withdrawal limit of {0} would be exceeded").format(flt(settings.max_withdrawal_per_day)))
        values = wallet.require_available(self.seller, amount)
        self.balance_before = values["available"]
        self.fee = flt(amount * flt(settings.withdrawal_fee_percent) / 100.0 + flt(settings.withdrawal_fee_flat), 2)
        if self.fee >= amount:
            frappe.throw(_("The withdrawal fee is higher than the amount"))
        self.net_amount = flt(amount - self.fee, 2)
        self.requested_on = now_datetime()
        auto = flt(settings.auto_approve_below)
        self.status = "Approved" if auto and amount <= auto else "Pending Approval"
        if self.status == "Approved":
            self.approved_by = "Administrator"

    def resolve_destination(self, seller):
        row = None
        if self.payout_account:
            row = next((r for r in seller.payout_accounts if r.name == self.payout_account), None)
        if not row:
            row = next((r for r in seller.payout_accounts if cint(r.is_default) and r.method == self.method), None) or next(
                (r for r in seller.payout_accounts if r.method == self.method), None
            )
        if not row:
            frappe.throw(_("Add a {0} payout account to the seller first").format(self.method))
        if not cint(row.verified):
            frappe.throw(_("The payout account {0} has not been verified yet").format(row.account_label or row.idx))
        self.payout_account = row.name
        self.mpesa_number = row.mpesa_number
        self.bank_account = row.bank_account
        self.account_holder = row.account_holder

    def after_insert(self):
        journal = accounting.hold_withdrawal(self)
        txn = wallet.post_transaction(self.seller, "Withdrawal", -flt(self.net_amount), reference=("Seller Withdrawal", self.name), journal_entry=journal, remarks=_("Withdrawal to {0}").format(self.method))
        if flt(self.fee):
            wallet.post_transaction(self.seller, "Withdrawal Fee", -flt(self.fee), reference=("Seller Withdrawal", self.name), journal_entry=journal)
        frappe.db.set_value("Seller Withdrawal", self.name, {"hold_journal": journal, "wallet_transaction": txn.name}, update_modified=False)
        self.reload()
        if self.status == "Approved":
            self.dispatch()

    @frappe.whitelist()
    def approve(self):
        self.check_permission("write")
        if self.status != "Pending Approval":
            frappe.throw(_("Only withdrawals waiting for approval can be approved"))
        if frappe.session.user == frappe.db.get_value("Marketplace Seller", self.seller, "owner") and "System Manager" not in frappe.get_roles():
            frappe.throw(_("A withdrawal cannot be approved by the person who requested it"))
        self.status = "Approved"
        self.approved_by = frappe.session.user
        self.flags.ignore_permissions = True
        self.save()
        self.dispatch()
        return self

    @frappe.whitelist()
    def reject(self, reason):
        self.check_permission("write")
        if self.status not in ("Pending Approval", "Approved"):
            frappe.throw(_("This withdrawal can no longer be rejected"))
        self.release_funds("Rejected", reason)

    def dispatch(self):
        if self.method == "M-Pesa" and mpesa.configured():
            result = mpesa.b2c_pay(self)
            if result["ok"]:
                self.status = "Processing"
                self.conversation_id = result.get("conversation_id")
                self.originator_conversation_id = result.get("originator")
                self.processed_on = now_datetime()
            else:
                self.failure_reason = result["error"]
                self.flags.ignore_permissions = True
                self.save()
                self.release_funds("Failed", result["error"])
                return
        self.flags.ignore_permissions = True
        self.save()

    @frappe.whitelist()
    def mark_paid(self, receipt_no=None):
        self.check_permission("write")
        if self.status in ("Paid", "Failed", "Rejected", "Cancelled"):
            return self
        journal = accounting.pay_withdrawal(self)
        self.payout_journal = journal
        self.status = "Paid"
        self.receipt_no = receipt_no or self.receipt_no
        self.processed_on = now_datetime()
        self.flags.ignore_permissions = True
        self.save()
        return self

    @frappe.whitelist()
    def mark_failed(self, reason):
        self.check_permission("write")
        self.release_funds("Failed", reason)

    def release_funds(self, status, reason=None):
        if self.status in ("Paid", "Failed", "Rejected", "Cancelled"):
            return self
        accounting.cancel_journal(self.hold_journal)
        wallet.post_transaction(self.seller, "Reversal", flt(self.amount), reference=("Seller Withdrawal", self.name), remarks=_("Withdrawal {0}: {1}").format(status.lower(), reason or ""))
        self.status = status
        self.failure_reason = reason
        self.flags.ignore_permissions = True
        self.save()
        return self
