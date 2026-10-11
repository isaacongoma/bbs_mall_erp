import frappe
from frappe import _
from frappe.utils import cint, flt, now_datetime

from apps.bbs_marketplace.marketplace.utils import vat_split


def active_campaign_row(listing, buyer_type):
    now = now_datetime()
    rows = frappe.db.sql(
        """
        select cl.name, cl.discount_type, cl.discount_value, cl.stock_limit, cl.sold_qty, c.funded_by, c.platform_share_percent, c.name as campaign
        from "tabCampaign Listing" cl join "tabMarketplace Campaign" c on c.name = cl.parent
        where cl.listing = %s and c.status = 'Active' and c.start_date <= %s and c.end_date >= %s
          and (c.buyer_type in ('Both', %s) or c.buyer_type is null)
        order by c.start_date desc limit 1
        """,
        (listing, now, now, buyer_type),
        as_dict=True,
    )
    return rows[0] if rows else None


def tier_price(doc, qty, buyer_type):
    best = None
    for tier in doc.get("price_tiers") or []:
        if tier.buyer_type in (buyer_type, None, "") and flt(qty) >= flt(tier.min_qty):
            if best is None or flt(tier.min_qty) > flt(best.min_qty):
                best = tier
    return flt(best.price) if best else None


def listing_price(listing, qty=1, buyer_type="B2C", variant=None):
    doc = listing if hasattr(listing, "price") else frappe.get_doc("Marketplace Listing", listing)
    unit = flt(doc.price)
    source = "Retail"
    own = None
    if variant and doc.get("has_variants"):
        row = next((r for r in doc.variants if r.item_code == variant), None)
        own = flt(row.price) if row is not None and row.price not in (None, "") and flt(row.price) > 0 else None
        if own:
            unit, source = own, "Variant price"
    tier = tier_price(doc, qty, buyer_type) if own is None else None
    if tier is not None:
        unit, source = tier, "Bulk tier" if buyer_type == "B2B" else "Quantity tier"
    campaign = active_campaign_row(doc.name, buyer_type)
    discount = 0.0
    funded_by, platform_share = "Seller", 0.0
    if campaign and (not campaign.stock_limit or flt(campaign.sold_qty) < flt(campaign.stock_limit)):
        if campaign.discount_type == "Percent":
            discount = unit * flt(campaign.discount_value) / 100.0
        else:
            discount = min(unit, flt(campaign.discount_value))
        funded_by = campaign.funded_by
        platform_share = flt(campaign.platform_share_percent)
        source = "Campaign " + str(campaign.campaign)
    return {
        "unit_price": flt(unit, 4),
        "discount_per_unit": flt(discount, 4),
        "price_includes_vat": cint(doc.price_includes_vat),
        "vat_rate": flt(doc.vat_rate),
        "source": source,
        "campaign": campaign.campaign if campaign else None,
        "funded_by": funded_by,
        "platform_share_percent": platform_share,
    }


def line_amounts(price, qty):
    qty = flt(qty)
    gross = price["unit_price"] * qty
    discount = price["discount_per_unit"] * qty
    paid = gross - discount
    if price["price_includes_vat"]:
        net, vat = vat_split(paid, price["vat_rate"], True)
    else:
        net, vat = vat_split(paid, price["vat_rate"], False)
        paid = net + vat
    return {"gross": flt(gross, 2), "discount": flt(discount, 2), "net": flt(net, 2), "vat": flt(vat, 2), "amount": flt(paid, 2)}


def apply_coupon(code, order_total):
    if not code:
        return {"discount": 0.0, "funded_by_seller": None, "coupon": None}
    if not frappe.db.exists("Coupon Code", code):
        frappe.throw(_("Coupon {0} does not exist").format(code))
    coupon = frappe.get_doc("Coupon Code", code)
    today = now_datetime().date()
    if coupon.valid_from and coupon.valid_from > today:
        frappe.throw(_("Coupon {0} is not valid yet").format(code))
    if coupon.valid_upto and coupon.valid_upto < today:
        frappe.throw(_("Coupon {0} has expired").format(code))
    if coupon.maximum_use and cint(coupon.used) >= cint(coupon.maximum_use):
        frappe.throw(_("Coupon {0} has been used up").format(code))
    rule = frappe.get_doc("Pricing Rule", coupon.pricing_rule) if coupon.pricing_rule else None
    if not rule or rule.disable:
        frappe.throw(_("Coupon {0} is not active").format(code))
    if flt(rule.min_amt) and flt(order_total) < flt(rule.min_amt):
        frappe.throw(_("Spend at least {0} to use this coupon").format(flt(rule.min_amt)))
    if rule.rate_or_discount == "Discount Percentage":
        discount = flt(order_total) * flt(rule.discount_percentage) / 100.0
    elif rule.rate_or_discount == "Discount Amount":
        discount = flt(rule.discount_amount)
    else:
        discount = 0.0
    if flt(rule.max_amt):
        discount = min(discount, flt(rule.max_amt))
    return {"discount": flt(min(discount, order_total), 2), "funded_by_seller": coupon.get("marketplace_seller"), "coupon": coupon.name}


def check_order_limits(doc, qty):
    qty = flt(qty)
    if qty < flt(doc.min_order_qty or 1):
        frappe.throw(_("{0}: the minimum order quantity is {1}").format(doc.listing_title, doc.min_order_qty))
    if flt(doc.max_order_qty) and qty > flt(doc.max_order_qty):
        frappe.throw(_("{0}: the maximum order quantity is {1}").format(doc.listing_title, doc.max_order_qty))
    multiple = flt(doc.order_multiple or 1)
    if multiple > 1 and qty % multiple:
        frappe.throw(_("{0}: sold in multiples of {1}").format(doc.listing_title, multiple))
