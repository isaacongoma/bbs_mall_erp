import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt


class ProductReview(Document):
    doctype = "Product Review"

    def validate(self):
        if cint(self.rating) < 1 or cint(self.rating) > 5:
            frappe.throw(_("The rating must be from 1 to 5"))
        bought = bool(
            self.marketplace_order
            and frappe.db.exists("Marketplace Order Item", {"parent": self.marketplace_order, "listing": self.listing})
            and frappe.db.get_value("Marketplace Order", self.marketplace_order, "customer") == self.customer
        )
        self.verified_purchase = 1 if bought else 0
        if self.is_new() and frappe.db.exists("Product Review", {"listing": self.listing, "customer": self.customer, "status": ["!=", "Rejected"]}):
            frappe.throw(_("You have already reviewed this product"))

    def on_update(self):
        self.refresh_listing()

    def on_trash(self):
        self.refresh_listing()

    def refresh_listing(self):
        row = frappe.db.sql(
            'select coalesce(avg(rating), 0), count(*) from "tabProduct Review" where listing = %s and status = \'Published\'', self.listing
        )[0]
        frappe.db.set_value("Marketplace Listing", self.listing, {"rating_average": flt(row[0], 2), "rating_count": cint(row[1])}, update_modified=False)
        seller = frappe.db.get_value("Marketplace Listing", self.listing, "seller")
        agg = frappe.db.sql(
            'select coalesce(avg(r.rating), 0), count(*) from "tabProduct Review" r join "tabMarketplace Listing" l on l.name = r.listing where l.seller = %s and r.status = \'Published\'',
            seller,
        )[0]
        frappe.db.set_value("Marketplace Seller", seller, {"rating": flt(agg[0], 2), "rating_count": cint(agg[1])}, update_modified=False)
