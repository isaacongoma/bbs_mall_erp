import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, flt, getdate, today

from apps.bbs_marketplace.marketplace import accounting, plans, wallet


class SellerAd(Document):
    doctype = "Seller Ad"

    def validate(self):
        package = frappe.get_doc("Ad Package", self.package)
        if not package.enabled:
            frappe.throw(_("The {0} package is not available").format(package.package_name))
        if not self.listings:
            frappe.throw(_("Choose the listings to advertise"))
        if len(self.listings) > (package.max_listings or 1):
            frappe.throw(_("{0} covers up to {1} listings").format(package.package_name, package.max_listings))
        seen = set()
        for row in self.listings:
            if row.listing in seen:
                frappe.throw(_("Row {0}: {1} appears twice").format(row.idx, row.listing))
            seen.add(row.listing)
            owner = frappe.db.get_value("Marketplace Listing", row.listing, "seller")
            if owner != self.seller:
                frappe.throw(_("Row {0}: {1} belongs to another seller").format(row.idx, row.listing))
        if self.status == "Pending Payment":
            self.amount = flt(package.price)
            self.vat_amount = plans.vat_on(self.amount)
            self.total = flt(self.amount + self.vat_amount, 2)

    @frappe.whitelist()
    def activate(self):
        self.check_permission("write")
        if self.status == "Active":
            return self.status
        if self.status != "Pending Payment":
            frappe.throw(_("A {0} ad cannot be activated").format(self.status))
        package = frappe.get_doc("Ad Package", self.package)
        if flt(self.total):
            wallet.require_available(self.seller, self.total)
            journal = accounting.post_service_charge(
                self.seller, "advertising_income_account", self.amount, self.vat_amount, _("{0} advertising for {1}").format(package.package_name, self.seller), self.name
            )
            wallet.post_transaction(
                self.seller,
                "Adjustment",
                -flt(self.total),
                reference=("Seller Ad", self.name),
                journal_entry=journal,
                remarks=_("Advertising: {0}").format(package.package_name),
            )
            self.journal_entry = journal
        self.start_date = getdate(today())
        self.end_date = add_days(self.start_date, (package.duration_days or 1) - 1)
        self.status = "Active"
        self.paid_on = getdate(today())
        self.flags.ignore_permissions = True
        self.save()
        for row in self.listings:
            frappe.db.set_value("Marketplace Listing", row.listing, {"is_sponsored": 1, "sponsored_until": self.end_date}, update_modified=False)
        return self.status

    def clear_sponsorship(self):
        for row in self.listings:
            other = frappe.db.sql(
                "select 1 from \"tabSeller Ad\" a join \"tabSeller Ad Listing\" l on l.parent = a.name where a.status = 'Active' and l.listing = %s and a.name != %s limit 1",
                (row.listing, self.name),
            )
            if not other:
                frappe.db.set_value("Marketplace Listing", row.listing, {"is_sponsored": 0, "sponsored_until": None}, update_modified=False)

    @frappe.whitelist()
    def cancel_ad(self):
        self.check_permission("write")
        if self.status not in ("Active", "Pending Payment"):
            return self.status
        was_active = self.status == "Active"
        self.status = "Cancelled"
        self.flags.ignore_permissions = True
        self.save()
        if was_active:
            self.clear_sponsorship()
        return self.status
