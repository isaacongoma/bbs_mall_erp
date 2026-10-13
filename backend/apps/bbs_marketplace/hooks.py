app_name = "bbs_marketplace"
app_title = "Marketplace"
app_publisher = "BBS Mall"
app_description = "B2B and B2C marketplace backend: seller listings, orders, courier delivery, seller wallets and payouts"
app_email = "info@bbsmall.co.ke"
app_license = "Proprietary"
required_apps = ["frappe/erpnext", "bbs_property"]
app_home = "/desk/marketplace"
app_logo_url = "/assets/bbs_marketplace/images/marketplace-logo.svg"

add_to_apps_screen = [
    {
        "name": app_name,
        "logo": "/assets/bbs_marketplace/images/marketplace-logo.svg",
        "title": app_title,
        "route": app_home,
        "has_permission": "bbs_marketplace.check_app_permission",
        "sequence_id": 4,
    }
]

after_install = "bbs_marketplace.setup.after_install"
after_migrate = "bbs_marketplace.setup.after_migrate"

code_only_modules = {}

doc_events = {
    "Coupon Code": {"validate": "bbs_marketplace.marketplace.vouchers.validate_coupon"},
    "Marketplace Order": {"on_update": "bbs_marketplace.marketplace.notifications.flush"},
    "Seller Order": {"on_update": "bbs_marketplace.marketplace.notifications.flush"},
    "Return Request": {"on_update": "bbs_marketplace.marketplace.notifications.on_field_change"},
    "Marketplace Shipment": {"on_update": "bbs_marketplace.marketplace.notifications.on_field_change"},
    "Seller Withdrawal": {"on_update": "bbs_marketplace.marketplace.notifications.on_field_change"},
    "Marketplace Listing": {"on_update": "bbs_marketplace.marketplace.notifications.on_field_change"},
    "Marketplace Seller": {"on_update": "bbs_marketplace.marketplace.notifications.on_field_change"},
    "Seller Subscription": {"on_update": "bbs_marketplace.marketplace.notifications.on_field_change"},
    "Seller Ad": {"on_update": "bbs_marketplace.marketplace.notifications.on_field_change"},
    "M-Pesa Transaction": {
        "on_update": "bbs_marketplace.marketplace.mpesa.on_transaction_update",
    },
    "Payment Entry": {
        "on_submit": "bbs_marketplace.marketplace.accounting.on_payment_entry",
    },
    "Item": {
        "on_trash": "bbs_marketplace.marketplace.catalog.block_item_delete",
    },
}

scheduler_events = {
    "all": [],
    "hourly": [
        "bbs_marketplace.marketplace.jobs.release_wallet_holds",
        "bbs_marketplace.marketplace.jobs.expire_unpaid_orders",
        "bbs_marketplace.marketplace.jobs.process_pending_withdrawals",
        "bbs_marketplace.marketplace.notifications.retry_failed",
        "bbs_marketplace.marketplace.jobs.send_cart_reminders",
    ],
    "daily": [
        "bbs_marketplace.marketplace.jobs.escalate_late_seller_orders",
        "bbs_marketplace.marketplace.jobs.abandon_stale_carts",
        "bbs_marketplace.marketplace.jobs.refresh_seller_metrics",
        "bbs_marketplace.marketplace.jobs.activate_campaigns",
        "bbs_marketplace.marketplace.plans.expire_subscriptions",
        "bbs_marketplace.marketplace.plans.expire_ads",
        "bbs_marketplace.marketplace.jobs.alert_low_stock",
    ],
}
