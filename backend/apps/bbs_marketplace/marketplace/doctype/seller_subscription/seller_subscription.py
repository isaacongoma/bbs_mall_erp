import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate, today

from apps.bbs_marketplace.marketplace import accounting, plans, wallet


class SellerSubscription(Document):
    doctype = "Seller Subscription"

    def validate(self):
        plan = frappe.get_doc("Seller Plan", self.plan)
        if not plan.enabled:
            frappe.throw(_("The {0} plan is not available").format(plan.plan_name))
        if self.status == "Pending Payment":
            fee = flt(plan.annual_fee if self.billing_period == "Annual" else plan.monthly_fee)
            self.amount = fee
            self.vat_amount = plans.vat_on(fee)
            self.total = flt(fee + self.vat_amount, 2)
            self.start_date = self.start_date or today()
            self.end_date = plans.period_end(self.start_date, self.billing_period)

    @frappe.whitelist()
    def activate(self):
        self.check_permission("write")
        if self.status == "Active":
            return self.status
        if self.status != "Pending Payment":
            frappe.throw(_("A {0} subscription cannot be activated").format(self.status))
        if flt(self.total):
            wallet.require_available(self.seller, self.total)
            journal = accounting.post_service_charge(
                self.seller, "subscription_income_account", self.amount, self.vat_amount, _("{0} plan for {1}").format(self.plan, self.seller), self.name
            )
            wallet.post_transaction(
                self.seller,
                "Adjustment",
                -flt(self.total),
                reference=("Seller Subscription", self.name),
                journal_entry=journal,
                remarks=_("{0} plan, {1} to {2}").format(self.plan, self.start_date, self.end_date),
            )
            self.journal_entry = journal
        for name in frappe.get_all("Seller Subscription", filters={"seller": self.seller, "status": "Active", "name": ["!=", self.name]}, pluck="name"):
            frappe.db.set_value("Seller Subscription", name, "status", "Expired", update_modified=False)
        self.status = "Active"
        self.paid_on = getdate(today())
        self.flags.ignore_permissions = True
        self.save()
        plans.set_seller_plan(self.seller, self.plan, self.end_date)
        return self.status

    @frappe.whitelist()
    def cancel_subscription(self):
        self.check_permission("write")
        if self.status not in ("Active", "Pending Payment"):
            return self.status
        was_active = self.status == "Active"
        self.status = "Cancelled"
        self.auto_renew = 0
        self.flags.ignore_permissions = True
        self.save()
        if was_active:
            plans.set_seller_plan(self.seller, plans.default_plan(), None)
        return self.status
