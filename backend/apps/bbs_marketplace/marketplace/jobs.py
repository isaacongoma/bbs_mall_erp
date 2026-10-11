import frappe
from frappe import _
from frappe.utils import add_to_date, cint, flt, getdate, now_datetime, today

from apps.bbs_marketplace.marketplace import notifications, orders, wallet
from apps.bbs_marketplace.marketplace.utils import get_settings


def release_wallet_holds():
    released = wallet.release_due_holds()
    for name in frappe.get_all("Seller Order", filters={"status": "Delivered", "settlement_status": "Held", "settle_on": ["<=", getdate(today())]}, pluck="name"):
        try:
            frappe.get_doc("Seller Order", name).complete()
            frappe.db.commit()
        except Exception:
            frappe.db.rollback()
            frappe.log_error(title=f"Completing seller order {name} failed")
    return released


def expire_unpaid_orders():
    minutes = cint(get_settings().unpaid_order_expiry_minutes)
    if not minutes:
        return 0
    cutoff = add_to_date(now_datetime(), minutes=-minutes)
    count = 0
    for name in frappe.get_all(
        "Marketplace Order",
        filters={"status": "Pending Payment", "payment_status": ["in", ["Unpaid", "Pending"]], "payment_method": ["not in", ["Cash on Delivery", "Credit Terms"]], "creation": ["<", cutoff]},
        pluck="name",
    ):
        try:
            orders.cancel_order(name, _("Payment was not received in time"))
            frappe.db.commit()
            count += 1
        except Exception:
            frappe.db.rollback()
            frappe.log_error(title=f"Expiring order {name} failed")
    return count


def process_pending_withdrawals():
    for name in frappe.get_all("Seller Withdrawal", filters={"status": "Approved", "method": "M-Pesa"}, pluck="name"):
        try:
            frappe.get_doc("Seller Withdrawal", name).dispatch()
            frappe.db.commit()
        except Exception:
            frappe.db.rollback()
            frappe.log_error(title=f"Dispatching withdrawal {name} failed")
    stale = add_to_date(now_datetime(), hours=-24)
    for name in frappe.get_all("Seller Withdrawal", filters={"status": "Processing", "processed_on": ["<", stale]}, pluck="name"):
        frappe.log_error(title="Marketplace withdrawal still processing", message=name)


def escalate_late_seller_orders():
    now = now_datetime()
    count = 0
    window = cint(get_settings().seller_accept_hours or 24)
    for name in frappe.get_all("Seller Order", filters={"status": "New", "creation": ["<", add_to_date(now, hours=-(window / 2))]}, pluck="name"):
        if not frappe.db.exists("Marketplace Notification Log", {"event_name": "Late Order Warning", "reference_name": name}):
            notifications.notify("Late Order Warning", frappe.get_doc("Seller Order", name))
    for name in frappe.get_all("Seller Order", filters={"status": "New", "sla_due": ["<", add_to_date(now, hours=-window)]}, pluck="name"):
        try:
            frappe.get_doc("Seller Order", name).cancel_order(_("The seller did not accept the order in time"))
            frappe.db.commit()
            count += 1
        except Exception:
            frappe.db.rollback()
            frappe.log_error(title=f"Auto cancelling seller order {name} failed")
    return count


def abandon_stale_carts():
    cutoff = add_to_date(now_datetime(), hours=-cint(get_settings().cart_expiry_hours or 72))
    frappe.db.sql('update "tabMarketplace Cart" set status = \'Abandoned\' where status = \'Active\' and modified < %s', cutoff)


def refresh_seller_metrics():
    for seller in frappe.get_all("Marketplace Seller", filters={"status": "Active"}, pluck="name"):
        rows = frappe.get_all("Seller Order", filters={"seller": seller}, fields=["status", "items_total"])
        total = len(rows)
        if not total:
            continue
        delivered = len([r for r in rows if r.status in ("Delivered", "Completed")])
        cancelled = len([r for r in rows if r.status == "Cancelled"])
        returned = frappe.db.count("Return Request", {"seller": seller, "status": ["in", ["Refunded", "Closed"]]})
        frappe.db.set_value(
            "Marketplace Seller",
            seller,
            {
                "total_orders": total,
                "total_sales": flt(sum(flt(r.items_total) for r in rows if r.status in ("Delivered", "Completed")), 2),
                "fulfilment_rate": flt(delivered * 100.0 / total, 2),
                "cancel_rate": flt(cancelled * 100.0 / total, 2),
                "return_rate": flt(returned * 100.0 / max(delivered, 1), 2),
            },
            update_modified=False,
        )
        wallet.refresh_seller_balances(seller)


def activate_campaigns():
    now = now_datetime()
    frappe.db.sql('update "tabMarketplace Campaign" set status = \'Active\' where status = \'Scheduled\' and start_date <= %s and end_date > %s', (now, now))
    frappe.db.sql('update "tabMarketplace Campaign" set status = \'Ended\' where status in (\'Active\', \'Scheduled\') and end_date <= %s', now)


def alert_low_stock():
    rows = frappe.db.sql(
        'select name, listing_title, seller, available_qty, low_stock_threshold from "tabMarketplace Listing" where status = \'Published\' and available_qty <= low_stock_threshold',
        as_dict=True,
    )
    by_seller = {}
    for row in rows:
        by_seller.setdefault(row.seller, []).append(row)
    for seller, listings in by_seller.items():
        notifications.notify("Low Stock Alert", frappe.get_doc("Marketplace Seller", seller), listings=listings)


def send_cart_reminders():
    settings = get_settings()
    if not cint(settings.cart_reminders_enabled):
        return 0
    first = cint(settings.cart_first_reminder_hours or 4)
    second = cint(settings.cart_second_reminder_hours)
    now = now_datetime()
    sent = 0
    carts = frappe.get_all(
        "Marketplace Cart",
        filters={"status": "Active", "customer": ["is", "set"], "last_activity": ["<", add_to_date(now, hours=-first)]},
        fields=["name", "reminder_count", "last_activity", "last_reminder_on"],
    )
    for row in carts:
        count = cint(row.reminder_count)
        if count >= (2 if second else 1):
            continue
        if count == 1 and add_to_date(row.last_activity, hours=second) > now:
            continue
        cart = frappe.get_doc("Marketplace Cart", row.name)
        live = [r for r in cart.items if frappe.db.get_value("Marketplace Listing", r.listing, "status") == "Published"]
        if not live:
            continue
        recent = frappe.db.exists("Marketplace Order", {"customer": cart.customer, "creation": [">", cart.last_activity]})
        if recent:
            continue
        notifications.notify("Abandoned Cart Reminder", cart)
        frappe.db.set_value("Marketplace Cart", cart.name, {"reminder_count": count + 1, "last_reminder_on": now}, update_modified=False)
        sent += 1
    return sent
