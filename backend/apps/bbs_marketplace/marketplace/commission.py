import frappe
from frappe.utils import flt, getdate, today

from apps.bbs_marketplace.marketplace.utils import get_settings

SPECIFICITY = {"Category and Seller": 4, "Seller": 3, "Brand": 3, "Category": 2, "Everything": 0}


def item_group_chain(item_group):
    if not item_group:
        return []
    chain = [item_group]
    bounds = frappe.db.get_value("Item Group", item_group, ["lft", "rgt"])
    if bounds and bounds[0] is not None:
        parents = frappe.db.sql(
            'select name from "tabItem Group" where lft <= %s and rgt >= %s order by lft desc', (bounds[0], bounds[1])
        )
        chain = [row[0] for row in parents] or chain
    return chain


def rules_for(seller, item_group, brand, buyer_type, on_date=None):
    on_date = getdate(on_date or today())
    groups = set(item_group_chain(item_group))
    matched = []
    for rule in frappe.get_all(
        "Commission Rule",
        filters={"enabled": 1},
        fields=["name", "applies_to", "priority", "buyer_type", "item_group", "seller", "brand", "rate_percent", "fixed_fee", "min_fee", "max_fee", "valid_from", "valid_upto"],
    ):
        if rule.buyer_type not in ("Both", None, "", buyer_type):
            continue
        if rule.valid_from and getdate(rule.valid_from) > on_date:
            continue
        if rule.valid_upto and getdate(rule.valid_upto) < on_date:
            continue
        kind = rule.applies_to
        if kind == "Category" and rule.item_group not in groups:
            continue
        if kind == "Seller" and rule.seller != seller:
            continue
        if kind == "Brand" and rule.brand != brand:
            continue
        if kind == "Category and Seller" and not (rule.item_group in groups and rule.seller == seller):
            continue
        matched.append(rule)
    matched.sort(key=lambda r: (r.priority or 0, SPECIFICITY.get(r.applies_to, 0)), reverse=True)
    return matched


def resolve(seller, item_group, brand=None, buyer_type="B2C", on_date=None):
    settings = get_settings()
    override = frappe.db.get_value("Marketplace Seller", seller, "commission_override")
    if override:
        return {"rate": flt(override), "fixed": 0.0, "min": 0.0, "max": 0.0, "source": "Seller override"}
    from apps.bbs_marketplace.marketplace import plans

    plan = plans.plan_for(seller)
    if plan and flt(plan.commission_rate):
        return {"rate": flt(plan.commission_rate), "fixed": 0.0, "min": 0.0, "max": 0.0, "source": f"Plan {plan.plan_name}"}
    matched = rules_for(seller, item_group, brand, buyer_type, on_date)
    specific = [r for r in matched if r.applies_to != "Everything"]
    if specific:
        rule = specific[0]
        return {"rate": flt(rule.rate_percent), "fixed": flt(rule.fixed_fee), "min": flt(rule.min_fee), "max": flt(rule.max_fee), "source": rule.name}
    for group in item_group_chain(item_group):
        rate = frappe.db.get_value("Item Group", group, "marketplace_commission")
        if rate:
            return {"rate": flt(rate), "fixed": 0.0, "min": 0.0, "max": 0.0, "source": f"Category {group}"}
    if matched:
        rule = matched[0]
        return {"rate": flt(rule.rate_percent), "fixed": flt(rule.fixed_fee), "min": flt(rule.min_fee), "max": flt(rule.max_fee), "source": rule.name}
    return {"rate": flt(settings.default_commission_rate), "fixed": 0.0, "min": 0.0, "max": 0.0, "source": "Settings default"}


def fee_for(terms, net_amount, qty):
    fee = flt(net_amount) * flt(terms["rate"]) / 100.0 + flt(terms["fixed"]) * flt(qty)
    if terms["min"]:
        fee = max(fee, flt(terms["min"]))
    if terms["max"]:
        fee = min(fee, flt(terms["max"]))
    return flt(fee, 2)
