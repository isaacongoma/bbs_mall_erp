import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt, now_datetime

from apps.bbs_marketplace.marketplace import orders, vouchers
from apps.bbs_marketplace.marketplace.utils import get_settings, log_event


class MarketplaceOrder(Document):
    doctype = "Marketplace Order"

    def before_validate(self):
        if not self.order_date:
            self.order_date = now_datetime()
        if not self.company:
            self.company = get_settings().company
        if not self.buyer_type:
            self.buyer_type = frappe.db.get_value("Customer", self.customer, "marketplace_buyer_type") or "B2C"
        if self.is_new() and not self.status_log:
            log_event(self, "Pending Payment", _("Order placed"))

    def validate(self):
        if not self.items:
            frappe.throw(_("Add at least one item"))
        if self.is_new() or self.status == "Pending Payment":
            orders.price_order(self)
        self.validate_delivery()
        self.validate_payment_method()

    def validate_delivery(self):
        if self.delivery_method == "Station Pickup" and not self.pickup_station:
            frappe.throw(_("Choose the pickup station"))
        digital = all(orders.is_digital(row.listing) for row in self.items)
        if self.delivery_method == "Courier Delivery" and not digital and not (self.address_snapshot or self.shipping_address):
            frappe.throw(_("Enter the delivery address"))
        if self.shipping_address and not self.address_snapshot:
            doc = frappe.get_doc("Address", self.shipping_address)
            self.address_snapshot = ", ".join(filter(None, [doc.address_line1, doc.address_line2, doc.city, doc.county, doc.country]))

    def validate_payment_method(self):
        if not self.payment_method:
            return
        row = next((r for r in get_settings().payment_methods if r.method == self.payment_method), None)
        if not row or not cint(row.enabled):
            frappe.throw(_("{0} is not available").format(self.payment_method))
        if row.audience not in ("Both", None, "", self.buyer_type):
            frappe.throw(_("{0} is not available to {1} buyers").format(self.payment_method, self.buyer_type))
        if flt(row.min_amount) and flt(self.grand_total) < flt(row.min_amount):
            frappe.throw(_("{0} needs an order of at least {1}").format(self.payment_method, flt(row.min_amount)))
        if flt(row.max_amount) and flt(self.grand_total) > flt(row.max_amount):
            frappe.throw(_("{0} allows orders up to {1}").format(self.payment_method, flt(row.max_amount)))
        if self.payment_method == "Cash on Delivery":
            for line in self.items:
                if not cint(frappe.db.get_value("Marketplace Listing", line.listing, "cod_allowed")):
                    frappe.throw(_("{0} cannot be paid on delivery").format(line.item_name))
            if self.buyer_type == "B2B":
                frappe.throw(_("Cash on delivery is for retail orders"))
        if self.payment_method == "Credit Terms":
            self.check_credit()

    def check_credit(self):
        limit = frappe.db.sql(
            'select coalesce(max(credit_limit), 0) from "tabCustomer Credit Limit" where parent = %s and company = %s',
            (self.customer, self.company),
        )[0][0]
        if not flt(limit):
            frappe.throw(_("{0} has no approved credit limit").format(self.customer))
        exposure = flt(
            frappe.db.sql(
                'select coalesce(sum(grand_total - paid_amount), 0) from "tabMarketplace Order" where customer = %s and payment_method = \'Credit Terms\' and status not in (\'Cancelled\', \'Refunded\') and name != %s',
                (self.customer, self.name or ""),
            )[0][0]
        )
        if exposure + flt(self.grand_total) > flt(limit):
            frappe.throw(_("This order would take {0} over its credit limit of {1}").format(self.customer, flt(limit)))

    def after_insert(self):
        orders.after_placement(self)

    def on_trash(self):
        if self.status not in ("Pending Payment", "Cancelled", "Failed"):
            frappe.throw(_("Orders that were paid cannot be deleted"))
        orders.release_stock(self)
        vouchers.release(self.name)

    @frappe.whitelist()
    def cancel_marketplace_order(self, reason=None):
        self.check_permission("write")
        orders.cancel_order(self.name, reason)
        self.reload()
        return self.status
