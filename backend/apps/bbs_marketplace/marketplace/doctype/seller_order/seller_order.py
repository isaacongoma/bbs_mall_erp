import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_to_date, cint, flt, now_datetime

from apps.bbs_marketplace.marketplace import accounting, inventory, logistics, orders
from apps.bbs_marketplace.marketplace.utils import get_settings, log_event

FLOW = {
    "New": {"Accepted", "Cancelled"},
    "Accepted": {"Packed", "Cancelled"},
    "Packed": {"Shipped", "Cancelled"},
    "Shipped": {"Delivered"},
    "Delivered": {"Completed", "Returned"},
    "Completed": set(),
    "Cancelled": set(),
    "Returned": set(),
}


class SellerOrder(Document):
    doctype = "Seller Order"

    def validate(self):
        before = self.get_doc_before_save()
        if before and before.status != self.status and self.status not in FLOW.get(before.status, set()):
            frappe.throw(_("A seller order cannot move from {0} to {1}").format(before.status, self.status))
        if not self.items:
            frappe.throw(_("A seller order needs items"))
        sellers = {frappe.db.get_value("Marketplace Listing", row.listing, "seller") for row in self.items}
        if sellers != {self.seller}:
            frappe.throw(_("All items must belong to {0}").format(self.seller))

    def move(self, status, note=None, **fields):
        if status not in FLOW.get(self.status, set()):
            frappe.throw(_("A seller order cannot move from {0} to {1}").format(self.status, status))
        self.status = status
        for key, value in fields.items():
            self.set(key, value)
        log_event(self, status, note)
        self.flags.ignore_permissions = True
        self.save()
        orders.roll_up_status(self.marketplace_order)

    @frappe.whitelist()
    def accept(self):
        self.check_permission("write")
        self.move("Accepted", _("Seller accepted the order"), accepted_on=now_datetime(), sla_due=add_to_date(now_datetime(), hours=cint(get_settings().seller_ship_hours or 48)))
        return self

    @frappe.whitelist()
    def mark_packed(self, courier=None, service_level="Standard"):
        self.check_permission("write")
        if self.fulfilment_mode != "Seller Drops at Station" or courier:
            self.courier = courier or self.courier or get_settings().default_courier
        self.move("Packed", _("Packed and ready for pickup"), packed_on=now_datetime())
        if self.courier:
            logistics.create_shipment(self.name, self.courier, service_level)
            self.reload()
        return self

    @frappe.whitelist()
    def mark_shipped(self, tracking_no=None):
        self.check_permission("write")
        shipment = self.shipment
        if not shipment and self.courier:
            shipment = logistics.create_shipment(self.name, self.courier)
        if shipment:
            doc = frappe.get_doc("Marketplace Shipment", shipment)
            doc.flags.skip_sync = True
            if tracking_no:
                doc.tracking_no = tracking_no
            doc.set_status("In Transit", _("Handed to courier"))
        for row in self.items:
            inventory.commit(row.listing, row.qty, row.variant_item)
        self.move("Shipped", _("Shipped"), shipped_on=now_datetime())
        self.shipment = shipment or self.shipment
        return self

    @frappe.whitelist()
    def mark_delivered(self, cod_collected=None):
        self.check_permission("write")
        if self.shipment:
            doc = frappe.get_doc("Marketplace Shipment", self.shipment)
            doc.flags.skip_sync = True
            if doc.status != "Delivered":
                doc.set_status("Delivered", _("Delivered"), cod_collected=cod_collected)
                self.reload()
        self.move("Delivered", _("Delivered to the buyer"), delivered_on=now_datetime())
        accounting.settle_seller_order(self.name)
        self.reload()
        return self

    @frappe.whitelist()
    def complete(self):
        self.check_permission("write")
        if frappe.db.exists("Return Request", {"seller_order": self.name, "status": ["in", ["Requested", "Approved", "Pickup Scheduled", "Received"]]}):
            return self
        self.move("Completed", _("Return window closed"))
        frappe.db.set_value("Seller Order", self.name, "settlement_status", "Settled", update_modified=False)
        return self

    @frappe.whitelist()
    def cancel_order(self, reason, release=True, refund=True):
        self.check_permission("write")
        if self.status in ("Shipped", "Delivered", "Completed"):
            frappe.throw(_("Seller order {0} has already shipped").format(self.name))
        if release:
            for row in self.items:
                inventory.release(row.listing, row.qty, row.variant_item)
        self.cancel_reason = reason
        self.move("Cancelled", reason)
        if self.shipment:
            doc = frappe.get_doc("Marketplace Shipment", self.shipment)
            doc.flags.skip_sync = True
            if doc.status in ("Pending", "Pickup Scheduled"):
                doc.set_status("Cancelled", reason)
        if refund:
            orders.refund_seller_order(self)
        return self
