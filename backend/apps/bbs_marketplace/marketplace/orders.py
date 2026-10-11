from collections import OrderedDict

import frappe
from frappe import _
from frappe.utils import add_to_date, cint, flt, now_datetime

from apps.bbs_marketplace.marketplace import accounting, inventory, logistics, pricing, variants
from apps.bbs_marketplace.marketplace import commission as commission_rules
from apps.bbs_marketplace.marketplace.utils import get_settings, log_event, vat_split

NO_SHIPPING = ("Mall Collection", "Seller Delivery")


def seller_groups(doc):
    groups = OrderedDict()
    for row in doc.items:
        groups.setdefault(row.seller, []).append(row)
    return groups


def validate_buyer(doc):
    settings = get_settings()
    if doc.buyer_type == "B2B" and not cint(settings.enable_b2b):
        frappe.throw(_("Business orders are switched off"))
    if doc.buyer_type != "B2B" and not cint(settings.enable_b2c):
        frappe.throw(_("Retail orders are switched off"))


def price_order(doc):
    validate_buyer(doc)
    subtotal = vat_total = campaign_discount = 0.0
    for row in doc.items:
        listing = frappe.get_doc("Marketplace Listing", row.listing)
        if listing.status != "Published":
            frappe.throw(_("{0} is not available for sale").format(listing.listing_title))
        seller = frappe.db.get_value("Marketplace Seller", listing.seller, ["status", "holiday_mode"], as_dict=True)
        if seller.status != "Active" or cint(seller.holiday_mode):
            frappe.throw(_("{0} cannot take orders right now").format(listing.listing_title))
        if listing.listing_type not in ("Both", doc.buyer_type):
            frappe.throw(_("{0} is not sold to {1} buyers").format(listing.listing_title, doc.buyer_type))
        pricing.check_order_limits(listing, row.qty)
        variant_row = None
        if cint(listing.has_variants):
            if not row.variant_item:
                frappe.throw(_("Choose an option for {0}").format(listing.listing_title))
            variant_row = variants.row_of(listing, row.variant_item)
        elif row.variant_item:
            row.variant_item = None
        price = pricing.listing_price(listing, row.qty, doc.buyer_type, row.variant_item)
        amounts = pricing.line_amounts(price, row.qty)
        row.item_code = row.variant_item or listing.item
        row.variant_label = variant_row.options if variant_row is not None else None
        row.item_name = f"{listing.listing_title} ({variant_row.options})" if variant_row is not None and variant_row.options else listing.listing_title
        row.seller = listing.seller
        row.uom = listing.stock_uom
        row.rate = flt(amounts["net"] / flt(row.qty), 4) if flt(row.qty) else 0
        row.vat_rate = price["vat_rate"]
        row.vat_amount = amounts["vat"]
        row.discount_amount = amounts["discount"]
        row.amount = amounts["amount"]
        subtotal += amounts["net"]
        vat_total += amounts["vat"]
        campaign_discount += amounts["discount"]
    items_total = flt(sum(flt(r.amount) for r in doc.items), 2)
    coupon = pricing.apply_coupon(doc.coupon_code, items_total)
    allocate_coupon(doc, coupon, items_total)
    shipping = 0.0
    if doc.delivery_method not in NO_SHIPPING:
        for seller, rows in seller_groups(doc).items():
            shipping += seller_shipping(doc, rows, seller)["fee"]
    doc.subtotal = flt(subtotal, 2)
    doc.vat_total = flt(vat_total, 2)
    doc.discount_total = flt(campaign_discount + coupon["discount"], 2)
    doc.shipping_total = flt(shipping, 2)
    doc.grand_total = flt(sum(flt(r.amount) for r in doc.items) + shipping, 2)
    doc.outstanding_amount = flt(doc.grand_total - flt(doc.paid_amount), 2)


def allocate_coupon(doc, coupon, items_total):
    discount = flt(coupon["discount"])
    seller_funded = coupon["funded_by_seller"]
    doc.platform_discount = 0.0
    doc.seller_discount = 0.0
    if not discount or not items_total:
        return
    remaining = discount
    rows = list(doc.items)
    for index, row in enumerate(rows):
        share = flt(discount * flt(row.amount) / items_total, 2) if index < len(rows) - 1 else flt(remaining, 2)
        share = min(share, flt(row.amount))
        remaining -= share
        row.discount_amount = flt(flt(row.discount_amount) + share, 2)
        row.amount = flt(flt(row.amount) - share, 2)
    if seller_funded:
        doc.seller_discount = flt(discount, 2)
    else:
        doc.platform_discount = flt(discount, 2)


def is_digital(listing):
    return bool(cint(frappe.db.get_value("Marketplace Listing", listing, "is_digital")))


def auto_fulfil_digital(order):
    previous = frappe.session.user
    frappe.set_user("Administrator")
    try:
        for name in frappe.get_all("Seller Order", filters={"marketplace_order": order.name, "status": "New"}, pluck="name"):
            so = frappe.get_doc("Seller Order", name)
            if not all(is_digital(row.listing) for row in so.items):
                continue
            so.accept()
            so.move("Packed", _("Digital goods need no packing"))
            so.mark_shipped()
            so.mark_delivered()
    finally:
        frappe.set_user(previous)


def seller_shipping(doc, rows, seller):
    if doc.delivery_method in NO_SHIPPING:
        return {"fee": 0.0, "courier": None, "service_level": "Standard"}
    if all(is_digital(row.listing) for row in rows):
        return {"fee": 0.0, "courier": None, "service_level": "Standard"}
    free = all(cint(frappe.db.get_value("Marketplace Listing", row.listing, "free_delivery")) for row in rows)
    value = flt(sum(flt(r.amount) for r in rows))
    if free:
        return {"fee": 0.0, "courier": None, "service_level": "Standard"}
    zone = doc.delivery_zone or get_settings().default_delivery_zone
    option = logistics.best_option(zone, logistics.parcel_weight(rows), value, doc.payment_method == "Cash on Delivery")
    if not option:
        frappe.throw(_("No courier delivers to {0} yet").format(zone or _("this area")))
    return {"fee": flt(option["fee"]), "courier": option["courier"], "service_level": option["service_level"]}


def reserve_stock(doc):
    done = []
    try:
        for row in doc.items:
            inventory.reserve(row.listing, row.qty, row.variant_item)
            done.append(row)
    except Exception:
        for row in done:
            inventory.release(row.listing, row.qty, row.variant_item)
        raise


def release_stock(doc):
    for row in doc.items:
        if not row.seller_order:
            inventory.release(row.listing, row.qty, row.variant_item)


def needs_payment_first(doc):
    return doc.payment_method not in ("Cash on Delivery", "Credit Terms")


def after_placement(doc):
    reserve_stock(doc)
    if not needs_payment_first(doc):
        confirm_order(doc.name)


def confirm_order(name):
    order = frappe.get_doc("Marketplace Order", name)
    if order.status not in ("Pending Payment", "Paid"):
        return order
    if frappe.db.exists("Seller Order", {"marketplace_order": order.name}):
        return order
    settings = get_settings()
    discount_share_platform = flt(order.platform_discount)
    items_total_all = flt(sum(flt(r.amount) for r in order.items))
    first = None
    for seller, rows in seller_groups(order).items():
        seller_doc = frappe.get_doc("Marketplace Seller", seller)
        info = seller_shipping(order, rows, seller)
        so = frappe.new_doc("Seller Order")
        so.marketplace_order = order.name
        so.seller = seller
        so.status = "New"
        so.fulfilment_mode = seller_doc.fulfilment_mode
        so.courier = info["courier"]
        so.shipping_fee = info["fee"]
        so.sla_due = add_to_date(now_datetime(), hours=cint(settings.seller_accept_hours or 24))
        group_total = flt(sum(flt(r.amount) for r in rows))
        platform_share = flt(discount_share_platform * group_total / items_total_all, 2) if items_total_all else 0.0
        seller_discount = 0.0
        vat_total = 0.0
        for row in rows:
            listing = frappe.get_doc("Marketplace Listing", row.listing)
            terms = commission_rules.resolve(seller, listing.item_group, listing.brand, order.buyer_type)
            share = flt(platform_share * flt(row.amount) / group_total, 2) if group_total else 0.0
            basis_gross = flt(row.amount) + share
            net_basis = basis_gross / (1 + flt(row.vat_rate) / 100.0)
            fee = commission_rules.fee_for(terms, net_basis, row.qty)
            so.append(
                "items",
                {
                    "listing": row.listing,
                    "variant_item": row.variant_item,
                    "variant_label": row.variant_label,
                    "item_code": row.item_code,
                    "item_name": row.item_name,
                    "qty": row.qty,
                    "rate": row.rate,
                    "vat_rate": row.vat_rate,
                    "vat_amount": row.vat_amount,
                    "amount": row.amount,
                    "commission_rate": terms["rate"],
                    "commission": fee,
                },
            )
            vat_total += flt(row.vat_amount)
        so.items_total = flt(group_total, 2)
        so.vat_total = flt(vat_total, 2)
        so.platform_discount = platform_share
        so.seller_discount = flt(order.seller_discount * group_total / items_total_all, 2) if items_total_all else 0.0
        so.commission_rate = flt(sum(flt(i.commission_rate) for i in so.items) / len(so.items), 2) if so.items else 0
        so.commission_amount = flt(sum(flt(i.commission) for i in so.items), 2)
        so.commission_vat = flt(so.commission_amount * flt(settings.commission_vat_rate) / 100.0, 2)
        so.seller_net = flt(group_total + platform_share - so.commission_amount - so.commission_vat, 2)
        log_event(so, "New", _("Order paid and passed to the seller"))
        so.flags.ignore_permissions = True
        so.insert()
        for row in rows:
            frappe.db.set_value("Marketplace Order Item", row.name, {"seller_order": so.name, "status": "New"}, update_modified=False)
        first = first or so.name
    order.reload()
    order.status = "Processing"
    log_event(order, "Processing", _("Seller orders created"))
    order.flags.ignore_permissions = True
    order.save()
    auto_fulfil_digital(order)
    return order


def apply_payment(order_name):
    order = frappe.get_doc("Marketplace Order", order_name)
    paid = flt(frappe.db.sql('select coalesce(sum(amount),0) from "tabMarketplace Payment" where marketplace_order = %s and status = \'Paid\'', order_name)[0][0], 2)
    refunded = flt(frappe.db.sql('select coalesce(sum(amount),0) from "tabMarketplace Payment" where marketplace_order = %s and status = \'Refunded\'', order_name)[0][0], 2)
    net = flt(paid - refunded, 2)
    status = "Unpaid"
    if refunded > 0 and net > 0:
        status = "Partially Refunded"
    elif refunded > 0:
        status = "Refunded"
    elif net >= flt(order.grand_total) - 0.005 and net > 0:
        status = "Paid"
    elif net > 0:
        status = "Pending"
    frappe.db.set_value("Marketplace Order", order_name, {"paid_amount": net, "outstanding_amount": flt(order.grand_total - net, 2), "payment_status": status}, update_modified=False)
    if status == "Paid":
        confirm_order(order_name)
    return status


def cancel_order(name, reason=None):
    frappe.flags.cancelling_order = name
    try:
        return cancel_order_now(name, reason)
    finally:
        frappe.flags.cancelling_order = None


def cancel_order_now(name, reason=None):
    order = frappe.get_doc("Marketplace Order", name)
    if order.status in ("Cancelled", "Refunded", "Completed"):
        return order
    shipped = frappe.db.exists("Seller Order", {"marketplace_order": name, "status": ["in", ["Shipped", "Delivered", "Completed"]]})
    if shipped:
        frappe.throw(_("Part of this order has already shipped. Use a return request instead"))
    for so in frappe.get_all("Seller Order", filters={"marketplace_order": name, "status": ["not in", ["Cancelled", "Returned"]]}, pluck="name"):
        doc = frappe.get_doc("Seller Order", so)
        doc.cancel_order(reason or _("Order cancelled"), release=True, refund=False)
    if not frappe.db.exists("Seller Order", {"marketplace_order": name}):
        release_stock(order)
    order.reload()
    paid = flt(order.paid_amount)
    if paid > 0:
        record_refund(order, paid, _("Cancelled order {0}").format(name))
    order.reload()
    order.status = "Cancelled"
    order.cancel_reason = reason
    order.payment_status = "Refunded" if paid > 0 else order.payment_status
    order.paid_amount = 0 if paid > 0 else order.paid_amount
    order.outstanding_amount = 0
    log_event(order, "Cancelled", reason)
    order.flags.ignore_permissions = True
    order.save()
    return order


def roll_up_status(order_name):
    if frappe.flags.get("cancelling_order") == order_name:
        return
    rows = frappe.get_all("Seller Order", filters={"marketplace_order": order_name}, fields=["status"])
    if not rows:
        return
    states = {row.status for row in rows}
    active = states - {"Cancelled", "Returned"}
    order = frappe.get_doc("Marketplace Order", order_name)
    if not active:
        new = "Cancelled"
    elif active <= {"Completed"}:
        new = "Completed"
    elif active <= {"Delivered", "Completed"}:
        new = "Delivered"
    elif active & {"Shipped", "Delivered", "Completed"} and active - {"Shipped", "Delivered", "Completed"}:
        new = "Partially Shipped"
    elif active <= {"Shipped", "Delivered", "Completed"}:
        new = "Shipped"
    else:
        new = "Processing"
    if new != order.status:
        order.status = new
        log_event(order, new)
        order.flags.ignore_permissions = True
        order.save()


def refund_method(order):
    return order.payment_method if order.payment_method in ("M-Pesa", "Card", "Bank Transfer") else "M-Pesa"


def record_refund(order, amount, remark):
    entry = accounting.refund_buyer(order.name, amount, refund_method(order), remark)
    payment = frappe.new_doc("Marketplace Payment")
    payment.marketplace_order = order.name
    payment.method = order.payment_method or "M-Pesa"
    payment.amount = flt(amount, 2)
    payment.status = "Refunded"
    payment.payment_entry = entry
    payment.company = order.company
    payment.flags.ignore_permissions = True
    payment.insert()
    return entry


def refund_seller_order(seller_order):
    order = frappe.get_doc("Marketplace Order", seller_order.marketplace_order)
    if flt(order.paid_amount) <= 0:
        return None
    amount = min(flt(seller_order.items_total + seller_order.shipping_fee, 2), flt(order.paid_amount))
    entry = record_refund(order, amount, _("Cancelled seller order {0}").format(seller_order.name))
    apply_payment(order.name)
    return entry
