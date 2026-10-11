import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, now_datetime

from apps.bbs_marketplace.marketplace import logistics
from apps.bbs_marketplace.marketplace.utils import get_settings

ORDER = [
    "Pending", "Pickup Scheduled", "Picked Up", "In Transit", "Out for Delivery", "Delivered", "Failed Delivery", "Returning", "Returned to Seller", "Cancelled",
]
FINAL = {"Delivered", "Returned to Seller", "Cancelled"}


class MarketplaceShipment(Document):
    doctype = "Marketplace Shipment"

    def validate(self):
        courier = self.courier
        if courier:
            doc = frappe.get_cached_doc("Courier", courier)
            if not doc.enabled:
                frappe.throw(_("Courier {0} is disabled").format(courier))
            if flt(doc.max_weight_kg) and flt(self.weight_kg) > flt(doc.max_weight_kg):
                frappe.throw(_("{0} carries parcels up to {1} kg").format(courier, doc.max_weight_kg))
            if flt(self.cod_amount) and not doc.cod_supported:
                frappe.throw(_("{0} does not collect cash on delivery").format(courier))

    @frappe.whitelist()
    def set_status(self, status, note=None, location=None, source="System", cod_collected=None):
        self.check_permission("write")
        if self.status in FINAL and status != self.status:
            frappe.throw(_("The shipment is already {0}").format(self.status))
        self.status = status
        if status == "Picked Up":
            self.picked_up_on = now_datetime()
        if status == "Delivered":
            self.delivered_on = now_datetime()
            if flt(self.cod_amount):
                self.cod_collected = flt(cod_collected if cod_collected is not None else self.cod_amount)
        self.append("events", {"status": status, "at": now_datetime(), "location": location or "", "note": note or "", "source": source})
        self.flags.ignore_permissions = True
        self.save()
        if not self.flags.skip_sync:
            self.sync_seller_order(status)

    def sync_seller_order(self, status):
        if not self.seller_order:
            return
        so = frappe.get_doc("Seller Order", self.seller_order)
        if status == "Delivered" and so.status == "Shipped":
            so.mark_delivered()
        elif status in ("Picked Up", "In Transit") and so.status == "Packed":
            so.mark_shipped(self.tracking_no)

    @frappe.whitelist()
    def create_courier_invoice(self):
        self.check_permission("write")
        if self.purchase_invoice or not flt(self.courier_cost):
            return self.purchase_invoice
        supplier = frappe.db.get_value("Courier", self.courier, "supplier")
        if not supplier:
            frappe.throw(_("Set a supplier on courier {0} to book its invoices").format(self.courier))
        settings = get_settings()
        item = ensure_courier_item()
        invoice = frappe.new_doc("Purchase Invoice")
        invoice.supplier = supplier
        invoice.company = settings.company
        invoice.posting_date = frappe.utils.today()
        invoice.bill_no = self.tracking_no or self.name
        invoice.append("items", {"item_code": item, "qty": 1, "rate": flt(self.courier_cost), "description": _("Delivery of {0}").format(self.seller_order), "cost_center": settings.cost_center})
        invoice.flags.ignore_permissions = True
        invoice.insert()
        frappe.db.set_value("Marketplace Shipment", self.name, "purchase_invoice", invoice.name, update_modified=False)
        return invoice.name


def ensure_courier_item():
    code = "Marketplace Courier Charge"
    if not frappe.db.exists("Item", code):
        group = frappe.db.get_value("Item Group", {"name": ["in", ["Services", "All Item Groups"]]}) or frappe.db.get_value("Item Group", {"is_group": 0})
        frappe.get_doc({"doctype": "Item", "item_code": code, "item_name": code, "item_group": group, "stock_uom": "Nos", "is_stock_item": 0, "is_purchase_item": 1, "is_sales_item": 0}).insert(ignore_permissions=True)
    return code
