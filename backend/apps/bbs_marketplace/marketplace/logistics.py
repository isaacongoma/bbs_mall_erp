import frappe
from frappe import _
from frappe.utils import cint, flt, now_datetime

from apps.bbs_marketplace.marketplace.utils import get_settings


def zone_for_address(county=None, town=None):
    if not county and not town:
        return get_settings().default_delivery_zone
    rows = frappe.db.sql(
        """
        select parent from "tabDelivery Zone Area"
        where (lower(county) = lower(%s) and coalesce(town, '') = '') or (lower(town) = lower(%s))
        order by case when lower(town) = lower(%s) then 0 else 1 end limit 1
        """,
        (county or "", town or "", town or ""),
    )
    return rows[0][0] if rows else get_settings().default_delivery_zone


def parcel_weight(items):
    total = 0.0
    for row in items:
        weight = flt(frappe.db.get_value("Marketplace Listing", row.listing, "weight_kg"))
        total += weight * flt(row.qty)
    return flt(total, 3)


def rate_rows(courier, zone, service="Standard"):
    doc = frappe.get_doc("Courier", courier)
    return [row for row in doc.rates if row.zone == zone and (row.service_level or "Standard") == service]


def quote(courier, zone, weight, service="Standard", cod=False, order_value=0.0):
    zone_doc = frappe.get_cached_doc("Delivery Zone", zone) if zone else None
    if zone_doc and flt(zone_doc.free_delivery_above) and flt(order_value) >= flt(zone_doc.free_delivery_above):
        return {"fee": 0.0, "eta_min": None, "eta_max": None, "reason": "Free delivery threshold"}
    rows = rate_rows(courier, zone, service)
    chosen = None
    for row in sorted(rows, key=lambda r: flt(r.max_weight) or 1e9):
        if flt(row.min_weight) <= flt(weight) and (not flt(row.max_weight) or flt(weight) <= flt(row.max_weight)):
            chosen = row
            break
    if not chosen and rows:
        chosen = sorted(rows, key=lambda r: flt(r.max_weight))[-1]
    if not chosen:
        return None
    extra = max(0.0, flt(weight) - flt(chosen.min_weight)) if not flt(chosen.max_weight) or flt(weight) > flt(chosen.max_weight) else 0.0
    fee = flt(chosen.base_rate) + extra * flt(chosen.per_kg_rate)
    if cod:
        fee += fee * flt(chosen.cod_fee_percent) / 100.0
    return {"fee": flt(fee, 2), "eta_min": chosen.eta_days_min, "eta_max": chosen.eta_days_max, "reason": "Courier rate"}


def available_options(zone, weight, order_value=0.0, cod=False):
    options = []
    for courier in frappe.get_all("Courier", filters={"enabled": 1}, pluck="name"):
        for service in ("Standard", "Express", "Same Day", "Freight"):
            result = quote(courier, zone, weight, service, cod, order_value)
            if result:
                options.append({"courier": courier, "service_level": service, **result})
    options.sort(key=lambda row: row["fee"])
    return options


def best_option(zone, weight, order_value=0.0, cod=False, courier=None):
    courier = courier or get_settings().default_courier
    if courier:
        result = quote(courier, zone, weight, "Standard", cod, order_value)
        if result:
            return {"courier": courier, "service_level": "Standard", **result}
    options = available_options(zone, weight, order_value, cod)
    return options[0] if options else None


def create_shipment(seller_order, courier=None, service_level="Standard"):
    so = frappe.get_doc("Seller Order", seller_order) if isinstance(seller_order, str) else seller_order
    if so.shipment:
        return so.shipment
    order = frappe.get_doc("Marketplace Order", so.marketplace_order)
    seller = frappe.get_doc("Marketplace Seller", so.seller)
    weight = parcel_weight(so.items)
    zone = order.delivery_zone or get_settings().default_delivery_zone
    cod = order.payment_method == "Cash on Delivery"
    option = quote(courier or so.courier or get_settings().default_courier, zone, weight, service_level, cod, so.items_total) if (courier or so.courier or get_settings().default_courier) else None
    shipment = frappe.new_doc("Marketplace Shipment")
    shipment.seller_order = so.name
    shipment.courier = courier or so.courier or get_settings().default_courier
    shipment.service_level = service_level
    shipment.status = "Pending"
    shipment.weight_kg = weight
    shipment.declared_value = so.items_total
    shipment.cod_amount = flt(order.outstanding_amount) and flt(so.items_total + so.shipping_fee) if cod else 0
    shipment.customer_fee = so.shipping_fee
    shipment.courier_cost = option["fee"] if option else 0
    shipment.pickup_address = seller.ship_from_address and frappe.db.get_value("Address", seller.ship_from_address, "address_line1") or seller.seller_name
    shipment.recipient_name = order.recipient_name
    shipment.recipient_phone = order.recipient_phone
    shipment.delivery_address = order.address_snapshot
    shipment.pickup_station = order.pickup_station if order.delivery_method == "Station Pickup" else None
    shipment.append("events", {"status": "Pending", "at": now_datetime(), "source": "System", "note": _("Shipment created")})
    shipment.flags.ignore_permissions = True
    shipment.insert()
    frappe.db.set_value("Seller Order", so.name, "shipment", shipment.name, update_modified=False)
    return shipment.name


def tracking_url(courier, tracking_no):
    template = frappe.db.get_value("Courier", courier, "tracking_url_template") if courier else None
    return template.replace("{tracking_no}", tracking_no or "") if template and tracking_no else None
