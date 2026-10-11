import frappe
from frappe import _
from frappe.utils import add_days, add_months, cint, flt, getdate, today

from apps.bbs_marketplace.marketplace.utils import get_settings


def default_plan():
    return frappe.db.get_value("Seller Plan", {"is_default": 1, "enabled": 1})


def plan_for(seller):
    row = frappe.db.get_value("Marketplace Seller", seller, ["current_plan", "plan_expires_on"], as_dict=True)
    if row and row.current_plan and (not row.plan_expires_on or getdate(row.plan_expires_on) >= getdate(today())):
        return frappe.get_cached_doc("Seller Plan", row.current_plan)
    name = default_plan()
    return frappe.get_cached_doc("Seller Plan", name) if name else None


def check_listing_limit(seller):
    if frappe.db.get_value("Marketplace Seller", seller, "seller_type") == "BBS Mall Own Stock":
        return
    plan = plan_for(seller)
    if not plan or not cint(plan.listing_limit):
        return
    used = frappe.db.count("Marketplace Listing", {"seller": seller, "status": ["!=", "Archived"]})
    if used >= cint(plan.listing_limit):
        frappe.throw(_("The {0} plan allows {1} listings. Upgrade your plan to add more.").format(plan.plan_name, plan.listing_limit))


def vat_on(amount):
    rate = flt(get_settings().default_vat_rate or 16)
    return flt(flt(amount) * rate / 100.0, 2)


def period_end(start, billing_period):
    return add_days(add_months(getdate(start), 12 if billing_period == "Annual" else 1), -1)


def set_seller_plan(seller, plan, expires_on):
    frappe.db.set_value("Marketplace Seller", seller, {"current_plan": plan, "plan_expires_on": expires_on}, update_modified=False)


def expire_subscriptions():
    for name in frappe.get_all("Seller Subscription", filters={"status": "Active", "end_date": ["<", getdate(today())]}, pluck="name"):
        sub = frappe.get_doc("Seller Subscription", name)
        renewed = False
        if sub.auto_renew:
            try:
                renewal = frappe.get_doc(
                    {"doctype": "Seller Subscription", "seller": sub.seller, "plan": sub.plan, "billing_period": sub.billing_period, "start_date": add_days(sub.end_date, 1), "auto_renew": 1}
                )
                renewal.flags.ignore_permissions = True
                renewal.insert()
                renewal.activate()
                renewed = True
            except Exception:
                frappe.db.rollback()
                frappe.log_error(title=f"Renewing subscription {name} failed")
        sub.reload()
        sub.status = "Expired"
        sub.flags.ignore_permissions = True
        sub.save()
        if not renewed:
            set_seller_plan(sub.seller, default_plan(), None)
        frappe.db.commit()


def expire_ads():
    for name in frappe.get_all("Seller Ad", filters={"status": "Active", "end_date": ["<", getdate(today())]}, pluck="name"):
        ad = frappe.get_doc("Seller Ad", name)
        ad.status = "Expired"
        ad.flags.ignore_permissions = True
        ad.save()
        ad.clear_sponsorship()
        frappe.db.commit()
