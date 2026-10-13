import json
import os
import pprint
import shutil
import uuid

APP = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "apps", "bbs_marketplace"))
TS = "2026-10-11 09:00:00.000000"
BASE = {"creation": TS, "modified": TS, "modified_by": "Administrator", "owner": "Administrator", "docstatus": 0}

MANAGER_ROLES = ["Marketplace Manager", "System Manager", "Accounts Manager"]
ACCOUNT_ROLES = MANAGER_ROLES + ["Accounts User"]


def scrub(name):
    return name.lower().replace(" ", "_").replace("-", "_")


def write(path, data=None, text=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        if text is not None:
            handle.write(text)
        else:
            handle.write(json.dumps(data, indent=1, ensure_ascii=False, sort_keys=True) + "\n")


def module_dir(module):
    return os.path.join(APP, scrub(module))


def roles(names):
    return [{"role": role} for role in names]


MODULES = {
    "Marketplace": {"icon": "store-duotone", "workspace_icon": "store"},
    "Marketplace Orders": {"icon": "orders-duotone", "workspace_icon": "shopping-cart"},
    "Seller Wallet": {"icon": "wallet-duotone", "workspace_icon": "wallet"},
    "Marketplace Logistics": {"icon": "logistics-duotone", "workspace_icon": "truck"},
    "Marketplace Promotions": {"icon": "promotions-duotone", "workspace_icon": "tag"},
}

CARDS = {
    "Marketplace": [
        ("Active Sellers", "Marketplace Seller", "Count", None, [["status", "=", "Active"]], "#16a34a"),
        ("Sellers Awaiting Approval", "Marketplace Seller", "Count", None, [["status", "=", "Pending Approval"]], "#f59e0b"),
        ("Published Listings", "Marketplace Listing", "Count", None, [["status", "=", "Published"]], "#2563eb"),
        ("Listings Awaiting Review", "Marketplace Listing", "Count", None, [["status", "=", "Pending Approval"]], "#f59e0b"),
        ("Open Support Tickets", "Issue", "Count", None, [["status", "=", "Open"]], "#7c3aed"),
    ],
    "Marketplace Orders": [
        ("Orders Awaiting Payment", "Marketplace Order", "Count", None, [["status", "=", "Pending Payment"]], "#f59e0b"),
        ("Orders In Progress", "Marketplace Order", "Count", None, [["status", "in", ["Paid", "Processing", "Partially Shipped", "Shipped"]]], "#2563eb"),
        ("Paid Order Value", "Marketplace Order", "Sum", "grand_total", [["payment_status", "=", "Paid"]], "#16a34a"),
        ("New Seller Orders", "Seller Order", "Count", None, [["status", "=", "New"]], "#7c3aed"),
        ("Open Return Requests", "Return Request", "Count", None, [["status", "in", ["Requested", "Approved", "Pickup Scheduled", "Received"]]], "#dc2626"),
        ("Delivered Orders", "Marketplace Order", "Count", None, [["status", "=", "Delivered"]], "#0891b2"),
    ],
    "Seller Wallet": [
        ("Wallet Liability", "Marketplace Seller", "Sum", "wallet_balance", [], "#2563eb"),
        ("Available to Withdraw", "Marketplace Seller", "Sum", "available_balance", [], "#16a34a"),
        ("Funds on Hold", "Marketplace Seller", "Sum", "pending_balance", [], "#f59e0b"),
        ("Pending Withdrawals", "Seller Withdrawal", "Count", None, [["status", "in", ["Requested", "Pending Approval"]]], "#dc2626"),
        ("Paid Out", "Seller Withdrawal", "Sum", "net_amount", [["status", "=", "Paid"]], "#7c3aed"),
    ],
    "Marketplace Logistics": [
        ("Shipments In Transit", "Marketplace Shipment", "Count", None, [["status", "in", ["Picked Up", "In Transit", "Out for Delivery"]]], "#2563eb"),
        ("Failed Deliveries", "Marketplace Shipment", "Count", None, [["status", "in", ["Failed Delivery", "Returning"]]], "#dc2626"),
        ("COD Awaiting Remittance", "Marketplace Shipment", "Sum", "cod_collected", [["cod_remitted", "=", 0], ["status", "=", "Delivered"]], "#f59e0b"),
    ],
    "Marketplace Promotions": [
        ("Active Campaigns", "Marketplace Campaign", "Count", None, [["status", "=", "Active"]], "#16a34a"),
        ("Scheduled Campaigns", "Marketplace Campaign", "Count", None, [["status", "=", "Scheduled"]], "#2563eb"),
        ("Running Ads", "Seller Ad", "Count", None, [["status", "=", "Active"]], "#f97316"),
        ("Active Subscriptions", "Seller Subscription", "Count", None, [["status", "=", "Active"]], "#7c3aed"),
        ("Active Vouchers", "Coupon Code", "Count", None, [["voucher_marketplace", "=", 1], ["voucher_status", "=", "Active"]], "#16a34a"),
    ],
}

CHARTS = {
    "Marketplace": [
        ("Sellers by Status", "Marketplace Seller", "Group By", "Pie", {"group_by_based_on": "status", "group_by_type": "Count"}, "#2563eb"),
        ("Listings by Status", "Marketplace Listing", "Group By", "Donut", {"group_by_based_on": "status", "group_by_type": "Count"}, "#16a34a"),
    ],
    "Marketplace Orders": [
        ("Orders by Status", "Marketplace Order", "Group By", "Pie", {"group_by_based_on": "status", "group_by_type": "Count"}, "#2563eb"),
        (
            "Marketplace Sales by Month",
            "Marketplace Order",
            "Sum",
            "Bar",
            {"based_on": "order_date", "value_based_on": "grand_total", "time_interval": "Monthly", "timespan": "Last Year", "timeseries": 1},
            "#f97316",
        ),
        (
            "Commission Earned by Month",
            "Seller Order",
            "Sum",
            "Line",
            {"based_on": "settled_on", "value_based_on": "commission_amount", "time_interval": "Monthly", "timespan": "Last Year", "timeseries": 1},
            "#16a34a",
        ),
    ],
    "Seller Wallet": [
        ("Withdrawals by Status", "Seller Withdrawal", "Group By", "Pie", {"group_by_based_on": "status", "group_by_type": "Count"}, "#7c3aed"),
        (
            "Payouts by Month",
            "Seller Withdrawal",
            "Sum",
            "Bar",
            {"based_on": "requested_on", "value_based_on": "net_amount", "time_interval": "Monthly", "timespan": "Last Year", "timeseries": 1},
            "#2563eb",
        ),
    ],
    "Marketplace Logistics": [
        ("Shipments by Status", "Marketplace Shipment", "Group By", "Donut", {"group_by_based_on": "status", "group_by_type": "Count"}, "#2563eb"),
        ("Shipments by Courier", "Marketplace Shipment", "Group By", "Bar", {"group_by_based_on": "courier", "group_by_type": "Count"}, "#f97316"),
    ],
    "Marketplace Promotions": [
        ("Campaigns by Status", "Marketplace Campaign", "Group By", "Pie", {"group_by_based_on": "status", "group_by_type": "Count"}, "#7c3aed"),
    ],
}

QUICK_LISTS = {
    "Marketplace": [
        ("Sellers to Approve", "Marketplace Seller", [["status", "=", "Pending Approval"]]),
        ("Listings to Moderate", "Marketplace Listing", [["status", "=", "Pending Approval"]]),
    ],
    "Marketplace Orders": [
        ("Seller Orders to Accept", "Seller Order", [["status", "=", "New"]]),
        ("Return Requests", "Return Request", [["status", "=", "Requested"]]),
    ],
    "Seller Wallet": [
        ("Withdrawals to Approve", "Seller Withdrawal", [["status", "in", ["Requested", "Pending Approval"]]]),
    ],
    "Marketplace Logistics": [
        ("Failed Deliveries", "Marketplace Shipment", [["status", "=", "Failed Delivery"]]),
    ],
    "Marketplace Promotions": [],
}

SIDEBARS = {
    "Marketplace": [
        ("Home", "Workspace", "Marketplace", "house"),
        ("Dashboard", "Dashboard", "Marketplace", "layout-dashboard"),
        ("Sellers", "DocType", "Marketplace Seller", "store"),
        ("Products", "DocType", "Marketplace Listing", "package"),
        ("Product Reviews", "DocType", "Product Review", "star"),
        ("Product Items", "DocType", "Item", "boxes", [["Item", "marketplace_seller", "is", "set", False]]),
        ("Categories", "DocType", "Item Group", "folder-tree"),
        ("Brands", "DocType", "Brand", "award"),
        ("Seller Plans", "DocType", "Seller Plan", "layers"),
        ("Subscriptions", "DocType", "Seller Subscription", "repeat"),
        ("Wishlists", "DocType", "Marketplace Wishlist Item", "heart"),
        ("Product Questions", "DocType", "Product Question", "message-circle-question"),
        ("Size Charts", "DocType", "Marketplace Size Chart", "ruler"),
        ("Item Attributes", "DocType", "Item Attribute", "tags"),
        ("Seller Notices", "DocType", "Seller Notice", "megaphone"),
        ("Followers", "DocType", "Marketplace Seller Follow", "user-plus"),
        ("Help Centre FAQs", "DocType", "Marketplace FAQ", "circle-help"),
        ("Support Tickets", "DocType", "Issue", "life-buoy"),
        ("Reports", "Section", None, "notepad-text"),
        ("Seller Performance", "Report", "Seller Performance", None),
        ("Listing Stock Status", "Report", "Listing Stock Status", None),
        ("Commission Rules", "DocType", "Commission Rule", "percent"),
        ("Notification Templates", "DocType", "Marketplace Notification Template", "mail"),
        ("Notification Log", "DocType", "Marketplace Notification Log", "bell"),
        ("Settings", "DocType", "Marketplace Settings", "settings"),
    ],
    "Marketplace Orders": [
        ("Home", "Workspace", "Marketplace Orders", "house"),
        ("Orders", "DocType", "Marketplace Order", "shopping-cart"),
        ("Seller Orders", "DocType", "Seller Order", "package-check"),
        ("Payments", "DocType", "Marketplace Payment", "credit-card"),
        ("Return Requests", "DocType", "Return Request", "undo-2"),
        ("Carts", "DocType", "Marketplace Cart", "shopping-basket"),
        ("Sales Invoices", "DocType", "Sales Invoice", "file-text"),
        ("Reports", "Section", None, "notepad-text"),
        ("Marketplace Sales Register", "Report", "Marketplace Sales Register", None),
        ("Marketplace Commission Report", "Report", "Marketplace Commission Report", None),
        ("Returns Summary", "Report", "Returns Summary", None),
    ],
    "Seller Wallet": [
        ("Home", "Workspace", "Seller Wallet", "house"),
        ("Wallet Transactions", "DocType", "Seller Wallet Transaction", "arrow-left-right"),
        ("Withdrawals", "DocType", "Seller Withdrawal", "banknote"),
        ("Bill Payments", "DocType", "Wallet Bill Payment", "receipt"),
        ("Journal Entries", "DocType", "Journal Entry", "book-open"),
        ("Reports", "Section", None, "notepad-text"),
        ("Seller Wallet Statement", "Report", "Seller Wallet Statement", None),
        ("Wallet Liability", "Report", "Wallet Liability", None),
        ("General Ledger", "Report", "General Ledger", None),
    ],
    "Marketplace Logistics": [
        ("Home", "Workspace", "Marketplace Logistics", "house"),
        ("Shipments", "DocType", "Marketplace Shipment", "truck"),
        ("Couriers", "DocType", "Courier", "bike"),
        ("Delivery Zones", "DocType", "Delivery Zone", "map"),
        ("Pickup Stations", "DocType", "Pickup Station", "map-pin"),
        ("Reports", "Section", None, "notepad-text"),
        ("Courier Performance", "Report", "Courier Performance", None),
        ("COD Reconciliation", "Report", "COD Reconciliation", None),
    ],
    "Marketplace Promotions": [
        ("Home", "Workspace", "Marketplace Promotions", "house"),
        ("Campaigns", "DocType", "Marketplace Campaign", "megaphone"),
        ("Banners", "DocType", "Marketplace Banner", "image"),
        ("Ad Packages", "DocType", "Ad Package", "megaphone"),
        ("Seller Ads", "DocType", "Seller Ad", "badge-dollar-sign"),
        ("Vouchers", "DocType", "Coupon Code", "ticket", [["Coupon Code", "voucher_marketplace", "=", 1, False]]),
        ("Voucher Redemptions", "DocType", "Marketplace Voucher Redemption", "receipt-text"),
        ("Voucher Claims", "DocType", "Marketplace Voucher Claim", "hand-coins"),
        ("Reports", "Section", None, "notepad-text"),
        ("Voucher Usage", "Report", "Voucher Usage", None),
        ("Pricing Rules", "DocType", "Pricing Rule", "badge-percent"),
    ],
}

CARD_WIDTHS = {"Seller Wallet": [2, 3, 2, 3, 2], "Marketplace": [2, 3, 2, 3, 2], "Marketplace Promotions": [2, 3, 2, 3, 2]}

DOCK_ORDER = ["Marketplace", "Marketplace Orders", "Seller Wallet", "Marketplace Logistics", "Marketplace Promotions"]

D = lambda label, field, ftype, **kw: {"label": label, "fieldname": field, "fieldtype": ftype, **kw}

REPORTS = [
    {
        "name": "Seller Performance",
        "module": "Marketplace",
        "ref_doctype": "Marketplace Seller",
        "total": 0,
        "columns": [
            D("Seller", "seller", "Link", options="Marketplace Seller", width=180),
            D("Status", "status", "Data", width=110),
            D("KYC", "kyc_status", "Data", width=100),
            D("Orders", "total_orders", "Int", width=90),
            D("Sales", "total_sales", "Currency", width=130),
            D("Fulfilment %", "fulfilment_rate", "Percent", width=110),
            D("Cancel %", "cancel_rate", "Percent", width=100),
            D("Return %", "return_rate", "Percent", width=100),
            D("Rating", "rating", "Float", width=80),
            D("Wallet Balance", "wallet_balance", "Currency", width=130),
        ],
        "select": "s.name as seller, s.status, s.kyc_status, s.total_orders, s.total_sales, s.fulfilment_rate, s.cancel_rate, s.return_rate, s.rating, s.wallet_balance",
        "from": 'from "tabMarketplace Seller" s',
        "order": "order by s.total_sales desc",
        "conditions": [("status", "s.status = %(status)s"), ("kyc_status", "s.kyc_status = %(kyc_status)s"), ("seller", "s.name = %(seller)s")],
    },
    {
        "name": "Listing Stock Status",
        "module": "Marketplace",
        "ref_doctype": "Marketplace Listing",
        "total": 0,
        "columns": [
            D("Listing", "listing", "Link", options="Marketplace Listing", width=140),
            D("Title", "listing_title", "Data", width=220),
            D("Seller", "seller", "Link", options="Marketplace Seller", width=160),
            D("Item", "item", "Link", options="Item", width=140),
            D("Status", "status", "Data", width=110),
            D("In Stock", "stock_qty", "Float", width=100),
            D("Reserved", "reserved_qty", "Float", width=100),
            D("Available", "available_qty", "Float", width=100),
            D("Low Stock At", "low_stock_threshold", "Float", width=110),
            D("Stock Level", "level", "Data", width=110),
        ],
        "select": "l.name as listing, l.listing_title, l.seller, l.item, l.status, l.stock_qty, l.reserved_qty, l.available_qty, l.low_stock_threshold, case when l.available_qty <= 0 then 'Out of Stock' when l.available_qty <= l.low_stock_threshold then 'Low' else 'OK' end as level",
        "from": 'from "tabMarketplace Listing" l',
        "order": "order by l.available_qty asc",
        "conditions": [
            ("seller", "l.seller = %(seller)s"),
            ("status", "l.status = %(status)s"),
            ("low_stock_only", "l.available_qty <= l.low_stock_threshold"),
        ],
        "flags": ["low_stock_only"],
    },
    {
        "name": "Marketplace Sales Register",
        "module": "Marketplace Orders",
        "ref_doctype": "Marketplace Order",
        "total": 1,
        "columns": [
            D("Order", "order", "Link", options="Marketplace Order", width=150),
            D("Date", "order_date", "Date", width=100),
            D("Customer", "customer", "Link", options="Customer", width=170),
            D("Buyer", "buyer_type", "Data", width=70),
            D("Status", "status", "Data", width=120),
            D("Payment", "payment_status", "Data", width=100),
            D("Method", "payment_method", "Data", width=110),
            D("Subtotal", "subtotal", "Currency", width=120),
            D("VAT", "vat_total", "Currency", width=110),
            D("Discount", "discount_total", "Currency", width=110),
            D("Delivery", "shipping_total", "Currency", width=110),
            D("Grand Total", "grand_total", "Currency", width=130),
            D("Paid", "paid_amount", "Currency", width=120),
            D("Outstanding", "outstanding_amount", "Currency", width=120),
        ],
        "select": "o.name as order, o.order_date::date as order_date, o.customer, o.buyer_type, o.status, o.payment_status, o.payment_method, o.subtotal, o.vat_total, o.discount_total, o.shipping_total, o.grand_total, o.paid_amount, o.outstanding_amount",
        "from": 'from "tabMarketplace Order" o',
        "order": "order by o.order_date desc",
        "conditions": [
            ("company", "o.company = %(company)s"),
            ("from_date", "o.order_date::date >= %(from_date)s"),
            ("to_date", "o.order_date::date <= %(to_date)s"),
            ("customer", "o.customer = %(customer)s"),
            ("buyer_type", "o.buyer_type = %(buyer_type)s"),
            ("status", "o.status = %(status)s"),
            ("payment_status", "o.payment_status = %(payment_status)s"),
            ("payment_method", "o.payment_method = %(payment_method)s"),
        ],
    },
    {
        "name": "Marketplace Commission Report",
        "module": "Marketplace Orders",
        "ref_doctype": "Seller Order",
        "total": 1,
        "columns": [
            D("Seller Order", "seller_order", "Link", options="Seller Order", width=150),
            D("Order", "marketplace_order", "Link", options="Marketplace Order", width=150),
            D("Seller", "seller", "Link", options="Marketplace Seller", width=170),
            D("Status", "status", "Data", width=100),
            D("Settlement", "settlement_status", "Data", width=110),
            D("Settled On", "settled_on", "Date", width=100),
            D("Items Total", "items_total", "Currency", width=120),
            D("Commission %", "commission_rate", "Percent", width=110),
            D("Commission", "commission_amount", "Currency", width=120),
            D("VAT on Commission", "commission_vat", "Currency", width=130),
            D("Seller Net", "seller_net", "Currency", width=120),
        ],
        "select": "so.name as seller_order, so.marketplace_order, so.seller, so.status, so.settlement_status, so.settled_on, so.items_total, so.commission_rate, so.commission_amount, so.commission_vat, so.seller_net",
        "from": 'from "tabSeller Order" so',
        "order": "order by so.creation desc",
        "conditions": [
            ("seller", "so.seller = %(seller)s"),
            ("settlement_status", "so.settlement_status = %(settlement_status)s"),
            ("from_date", "so.creation::date >= %(from_date)s"),
            ("to_date", "so.creation::date <= %(to_date)s"),
        ],
    },
    {
        "name": "Returns Summary",
        "module": "Marketplace Orders",
        "ref_doctype": "Return Request",
        "total": 1,
        "columns": [
            D("Return", "return_request", "Link", options="Return Request", width=150),
            D("Requested", "requested_on", "Date", width=100),
            D("Order", "marketplace_order", "Link", options="Marketplace Order", width=150),
            D("Seller", "seller", "Link", options="Marketplace Seller", width=160),
            D("Customer", "customer", "Link", options="Customer", width=160),
            D("Reason", "reason", "Data", width=140),
            D("Resolution", "resolution", "Data", width=110),
            D("Status", "status", "Data", width=110),
            D("Seller Liable", "seller_liable", "Check", width=100),
            D("Refund", "refund_amount", "Currency", width=120),
        ],
        "select": "r.name as return_request, r.creation::date as requested_on, r.marketplace_order, r.seller, r.customer, r.reason, r.resolution, r.status, r.seller_liable, r.refund_amount",
        "from": 'from "tabReturn Request" r',
        "order": "order by r.creation desc",
        "conditions": [
            ("seller", "r.seller = %(seller)s"),
            ("status", "r.status = %(status)s"),
            ("reason", "r.reason = %(reason)s"),
            ("from_date", "r.creation::date >= %(from_date)s"),
            ("to_date", "r.creation::date <= %(to_date)s"),
        ],
    },
    {
        "name": "Seller Wallet Statement",
        "module": "Seller Wallet",
        "ref_doctype": "Seller Wallet Transaction",
        "total": 0,
        "columns": [
            D("Date", "posting_date", "Date", width=100),
            D("Transaction", "transaction", "Link", options="Seller Wallet Transaction", width=150),
            D("Type", "transaction_type", "Data", width=150),
            D("Status", "status", "Data", width=90),
            D("Amount", "amount", "Currency", width=120),
            D("Balance", "balance_after", "Currency", width=120),
            D("Available On", "available_on", "Date", width=110),
            D("Reference Type", "reference_doctype", "Data", width=140),
            D("Reference", "reference_name", "Dynamic Link", options="reference_doctype", width=160),
            D("Remarks", "remarks", "Data", width=220),
        ],
        "select": "t.posting_date::date as posting_date, t.name as transaction, t.transaction_type, t.status, t.amount, t.balance_after, t.available_on, t.reference_doctype, t.reference_name, t.remarks",
        "from": 'from "tabSeller Wallet Transaction" t',
        "order": "order by t.posting_date desc, t.creation desc",
        "conditions": [
            ("seller", "t.seller = %(seller)s"),
            ("transaction_type", "t.transaction_type = %(transaction_type)s"),
            ("status", "t.status = %(status)s"),
            ("from_date", "t.posting_date::date >= %(from_date)s"),
            ("to_date", "t.posting_date::date <= %(to_date)s"),
        ],
    },
    {
        "name": "Voucher Usage",
        "module": "Marketplace Promotions",
        "ref_doctype": "Coupon Code",
        "total": 1,
        "columns": [
            D("Voucher", "voucher", "Link", options="Coupon Code", width=180),
            D("Code", "code", "Data", width=130),
            D("Issued By", "seller", "Link", options="Marketplace Seller", width=170),
            D("Type", "voucher_type", "Data", width=130),
            D("Status", "voucher_status", "Data", width=110),
            D("Valid From", "valid_from", "Date", width=100),
            D("Valid Until", "valid_upto", "Date", width=100),
            D("Times Used", "used", "Int", width=100),
            D("Limit", "maximum_use", "Int", width=80),
            D("Total Discount Given", "voucher_total_discount", "Currency", width=160),
        ],
        "select": "c.name as voucher, c.coupon_code as code, c.marketplace_seller as seller, c.voucher_type, c.voucher_status, c.valid_from, c.valid_upto, c.used, c.maximum_use, c.voucher_total_discount",
        "from": 'from "tabCoupon Code" c',
        "order": "order by c.voucher_total_discount desc",
        "base": ["c.voucher_marketplace = 1"],
        "conditions": [
            ("seller", "c.marketplace_seller = %(seller)s"),
            ("status", "c.voucher_status = %(status)s"),
            ("voucher_type", "c.voucher_type = %(voucher_type)s"),
        ],
    },
    {
        "name": "Courier Performance",
        "module": "Marketplace Logistics",
        "ref_doctype": "Marketplace Shipment",
        "total": 1,
        "columns": [
            D("Courier", "courier", "Link", options="Courier", width=180),
            D("Shipments", "shipments", "Int", width=100),
            D("Delivered", "delivered", "Int", width=100),
            D("Failed", "failed", "Int", width=90),
            D("Returned", "returned", "Int", width=100),
            D("Delivery Rate %", "delivery_rate", "Percent", width=120),
            D("Avg Days to Deliver", "avg_days", "Float", width=140),
            D("Courier Cost", "courier_cost", "Currency", width=120),
            D("Delivery Fees Charged", "customer_fee", "Currency", width=150),
        ],
        "select": (
            "sh.courier, count(*) as shipments, "
            "sum(case when sh.status = 'Delivered' then 1 else 0 end) as delivered, "
            "sum(case when sh.status = 'Failed Delivery' then 1 else 0 end) as failed, "
            "sum(case when sh.status in ('Returning', 'Returned to Seller') then 1 else 0 end) as returned, "
            "round(100.0 * sum(case when sh.status = 'Delivered' then 1 else 0 end) / nullif(count(*), 0), 2) as delivery_rate, "
            "round(avg(case when sh.status = 'Delivered' and sh.picked_up_on is not null and sh.delivered_on is not null then extract(epoch from (sh.delivered_on::timestamp - sh.picked_up_on::timestamp)) / 86400 end)::numeric, 2) as avg_days, "
            "coalesce(sum(sh.courier_cost), 0) as courier_cost, coalesce(sum(sh.customer_fee), 0) as customer_fee"
        ),
        "from": 'from "tabMarketplace Shipment" sh',
        "group": "group by sh.courier",
        "order": "order by shipments desc",
        "conditions": [
            ("courier", "sh.courier = %(courier)s"),
            ("from_date", "sh.creation::date >= %(from_date)s"),
            ("to_date", "sh.creation::date <= %(to_date)s"),
        ],
    },
    {
        "name": "COD Reconciliation",
        "module": "Marketplace Logistics",
        "ref_doctype": "Marketplace Shipment",
        "total": 1,
        "columns": [
            D("Shipment", "shipment", "Link", options="Marketplace Shipment", width=150),
            D("Courier", "courier", "Link", options="Courier", width=160),
            D("Seller Order", "seller_order", "Link", options="Seller Order", width=150),
            D("Status", "status", "Data", width=120),
            D("Delivered On", "delivered_on", "Date", width=110),
            D("COD Due", "cod_amount", "Currency", width=120),
            D("COD Collected", "cod_collected", "Currency", width=130),
            D("Difference", "difference", "Currency", width=120),
            D("Remitted", "cod_remitted", "Check", width=90),
        ],
        "select": "sh.name as shipment, sh.courier, sh.seller_order, sh.status, sh.delivered_on::date as delivered_on, sh.cod_amount, sh.cod_collected, sh.cod_collected - sh.cod_amount as difference, sh.cod_remitted",
        "from": 'from "tabMarketplace Shipment" sh',
        "order": "order by sh.delivered_on desc nulls last",
        "base": ["sh.cod_amount > 0"],
        "conditions": [
            ("courier", "sh.courier = %(courier)s"),
            ("status", "sh.status = %(status)s"),
            ("remitted", "sh.cod_remitted = %(remitted)s"),
            ("from_date", "sh.creation::date >= %(from_date)s"),
            ("to_date", "sh.creation::date <= %(to_date)s"),
        ],
    },
]

WALLET_LIABILITY = '''import frappe
from frappe import _
from frappe.utils import flt

from apps.bbs_marketplace.marketplace import wallet


def execute(filters=None):
    filters = frappe._dict(filters or {})
    params = {}
    where = []
    if filters.status:
        where.append("s.status = %(status)s")
        params["status"] = filters.status
    clause = ("where " + " and ".join(where)) if where else ""
    sellers = frappe.db.sql(
        f"""
        select s.name as seller, s.status, s.supplier, s.wallet_balance, s.pending_balance, s.available_balance
        from "tabMarketplace Seller" s
        {clause}
        order by s.wallet_balance desc
        """,
        params,
        as_dict=True,
    )
    for row in sellers:
        row["ledger_balance"] = flt(wallet.gl_balance(row["seller"]), 2)
        row["difference"] = flt(row["ledger_balance"] - flt(row["wallet_balance"]), 2)
    columns = [
        {"label": _("Seller"), "fieldname": "seller", "fieldtype": "Link", "options": "Marketplace Seller", "width": 180},
        {"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 110},
        {"label": _("Wallet Supplier"), "fieldname": "supplier", "fieldtype": "Link", "options": "Supplier", "width": 160},
        {"label": _("Wallet Balance"), "fieldname": "wallet_balance", "fieldtype": "Currency", "width": 130},
        {"label": _("On Hold"), "fieldname": "pending_balance", "fieldtype": "Currency", "width": 120},
        {"label": _("Available"), "fieldname": "available_balance", "fieldtype": "Currency", "width": 120},
        {"label": _("Ledger Balance"), "fieldname": "ledger_balance", "fieldtype": "Currency", "width": 130},
        {"label": _("Difference"), "fieldname": "difference", "fieldtype": "Currency", "width": 110},
    ]
    return columns, sellers
'''

REPORT_TEMPLATE = '''import frappe
from frappe import _

COLUMNS = {columns}
CONDITIONS = {conditions}
FLAGS = {flags}
BASE = {base}


def execute(filters=None):
    filters = frappe._dict(filters or {{}})
    where = list(BASE)
    params = {{}}
    for name, fragment in CONDITIONS:
        value = filters.get(name)
        if name in FLAGS:
            if value:
                where.append(fragment)
        elif value not in (None, ""):
            where.append(fragment)
            params[name] = value
    clause = ("where " + " and ".join(where)) if where else ""
    data = frappe.db.sql(
        f"""
        select {select}
        {source}
        {{clause}}
        {group}
        {order}
        """,
        params,
        as_dict=True,
    )
    columns = [dict(column, label=_(column["label"])) for column in COLUMNS]
    return columns, data
'''


def report_files(report):
    folder = os.path.join(module_dir(report["module"]), "report", scrub(report["name"]))
    stem = scrub(report["name"])
    meta = {
        **BASE,
        "add_total_row": report["total"],
        "columns": [],
        "disabled": 0,
        "doctype": "Report",
        "filters": [],
        "idx": 0,
        "is_standard": "Yes",
        "module": report["module"],
        "name": report["name"],
        "prepared_report": 0,
        "ref_doctype": report["ref_doctype"],
        "report_name": report["name"],
        "report_type": "Script Report",
        "roles": roles(ACCOUNT_ROLES),
    }
    write(os.path.join(folder, f"{stem}.json"), meta)
    write(os.path.join(folder, "__init__.py"), text="")
    if report["name"] == "Wallet Liability":
        write(os.path.join(folder, f"{stem}.py"), text=WALLET_LIABILITY)
        return
    code = REPORT_TEMPLATE.format(
        columns=pprint.pformat(report["columns"], width=140, sort_dicts=False),
        conditions=pprint.pformat(report["conditions"], width=140),
        flags=repr(report.get("flags", [])),
        base=repr(report.get("base", [])),
        select=report["select"].replace("{", "{{").replace("}", "}}"),
        source=report["from"],
        group=report.get("group", ""),
        order=report["order"],
    )
    write(os.path.join(folder, f"{stem}.py"), text=code)


def number_card(module, label, doctype, function, field, filters, color):
    stats = [[doctype, f, op, value, False] for f, op, value in filters]
    data = {
        **BASE,
        "doctype": "Number Card",
        "document_type": doctype,
        "dynamic_filters_json": "[]",
        "filters_json": json.dumps(stats),
        "function": function,
        "idx": 0,
        "is_public": 1,
        "is_standard": 1,
        "label": label,
        "module": module,
        "name": label,
        "show_percentage_stats": 0,
        "stats_time_interval": "Monthly",
        "type": "Document Type",
        "show_full_number": 0,
        "color": color,
    }
    if field:
        data["aggregate_function_based_on"] = field
    write(os.path.join(module_dir(module), "number_card", scrub(label), f"{scrub(label)}.json"), data)


def dashboard_chart(module, label, doctype, chart_type, kind, extra, color):
    data = {
        **BASE,
        "based_on": "",
        "chart_name": label,
        "chart_type": chart_type,
        "doctype": "Dashboard Chart",
        "document_type": doctype,
        "dynamic_filters_json": "[]",
        "filters_json": "[]",
        "idx": 0,
        "is_public": 1,
        "is_standard": 1,
        "module": module,
        "name": label,
        "roles": roles(MANAGER_ROLES),
        "show_values_over_chart": 0,
        "source": "",
        "type": kind,
        "use_report_chart": 0,
        "y_axis": [],
        "color": color,
    }
    data.update(extra)
    write(os.path.join(module_dir(module), "dashboard_chart", scrub(label), f"{scrub(label)}.json"), data)


def child(parent, parent_type, field, idx, doctype, values):
    return {
        "name": f"{scrub(parent)}-{field}{idx - 1}",
        **BASE,
        "idx": idx,
        "parent": parent,
        "parentfield": field,
        "parenttype": parent_type,
        "doctype": doctype,
        **values,
    }


def block_id(seed):
    return uuid.uuid5(uuid.NAMESPACE_DNS, seed).hex[:10]


def workspace(module):
    meta = MODULES[module]
    cards = CARDS[module]
    charts = CHARTS[module]
    quick = QUICK_LISTS[module]
    onboarding = module == "Marketplace"
    content = []
    if onboarding:
        content.append({"id": block_id(module + "onboarding"), "type": "onboarding", "data": {"onboarding_name": "Marketplace Onboarding", "col": 12}})
    widths = CARD_WIDTHS.get(module) or [{1: 12, 2: 6, 3: 4, 4: 3, 6: 4}.get(len(cards), 3)] * len(cards)
    for (label, *_), width in zip(cards, widths):
        content.append({"id": block_id(module + label), "type": "number_card", "data": {"number_card_name": label, "col": width}})
    spans = [12 // max(1, len(charts))] * len(charts)
    for (label, *_), span in zip(charts, spans):
        content.append({"id": block_id(module + label), "type": "chart", "data": {"chart_name": label, "col": span}})
    for label, *_ in quick:
        content.append({"id": block_id(module + label), "type": "quick_list", "data": {"quick_list_name": label, "col": 6}})
    data = {
        **BASE,
        "app": "bbs_marketplace",
        "charts": [child(module, "Workspace", "charts", i + 1, "Workspace Chart", {"chart_name": c[0], "label": c[0]}) for i, c in enumerate(charts)],
        "content": json.dumps(content),
        "custom_blocks": [],
        "doctype": "Workspace",
        "for_user": "",
        "hide_custom": 0,
        "icon": meta["workspace_icon"],
        "idx": 0,
        "is_hidden": 0,
        "label": module,
        "links": [],
        "module": module,
        "name": module,
        "number_cards": [child(module, "Workspace", "number_cards", i + 1, "Workspace Number Card", {"number_card_name": c[0], "label": c[0]}) for i, c in enumerate(cards)],
        "parent_page": "",
        "public": 1,
        "quick_lists": [
            child(module, "Workspace", "quick_lists", i + 1, "Workspace Quick List", {"document_type": q[1], "label": q[0], "quick_list_filter": json.dumps([[q[1], f, op, v, False] for f, op, v in q[2]])})
            for i, q in enumerate(quick)
        ],
        "roles": [],
        "shortcuts": [],
    }
    write(os.path.join(module_dir(module), "workspace", scrub(module), f"{scrub(module)}.json"), data)


def sidebar(module):
    items = []
    in_reports = False
    for entry in SIDEBARS[module]:
        label, kind, target, icon = entry[:4]
        item_filters = entry[4] if len(entry) > 4 else None
        base = {"added": 0, "hidden": 0, "label": label, "child": 0, "collapsible": 1, "indent": 0, "keep_closed": 0, "show_arrow": 0, "open_in_new_tab": 0, "is_default_module": 0}
        if kind == "Section":
            in_reports = True
            items.append({**base, "link_type": "DocType", "type": "Section Break", "icon": icon, "indent": 1})
            continue
        row = {**base, "link_to": target, "link_type": kind, "type": "Link"}
        if item_filters:
            row["filters"] = json.dumps(item_filters)
        if kind == "Report":
            row["child"] = 1
        elif icon:
            row["icon"] = icon
        items.append(row)
    data = {
        **BASE,
        "app": "bbs_marketplace",
        "doctype": "Sidebar",
        "header_icon": MODULES[module]["icon"],
        "idx": 0,
        "items": items,
        "module": module,
        "name": module,
        "standard": 1,
        "title": module,
    }
    write(os.path.join(module_dir(module), "sidebar", scrub(module), f"{scrub(module)}.json"), data)


def dock():
    items = [{"added": 0, "hidden": 0, "icon": MODULES[m]["icon"], "link_to": m, "link_type": "Sidebar", "title": m} for m in DOCK_ORDER]
    data = {**BASE, "app": "bbs_marketplace", "doctype": "Dock", "idx": 0, "items": items, "name": "bbs_marketplace", "standard": 1, "user": ""}
    write(os.path.join(APP, "dock", "bbs_marketplace", "bbs_marketplace.json"), data)


def dashboard():
    module = "Marketplace"
    cards = [c for m in DOCK_ORDER for c in CARDS[m]]
    charts = [c for m in DOCK_ORDER for c in CHARTS[m]]
    data = {
        **BASE,
        "cards": [{"card": c[0], "doctype": "Number Card Link"} for c in cards],
        "charts": [{"chart": c[0], "width": "Half", "doctype": "Dashboard Chart Link"} for c in charts],
        "dashboard_name": module,
        "doctype": "Dashboard",
        "idx": 0,
        "is_default": 0,
        "is_standard": 1,
        "module": module,
        "name": module,
    }
    write(os.path.join(module_dir(module), "dashboard", scrub(module), f"{scrub(module)}.json"), data)


ONBOARDING_STEPS = [
    ("Configure Marketplace Settings", "Set commission, accounts and payment methods", "Choose the company, the accounts marketplace money posts to, the payment methods buyers can use and the commission and hold rules. See [Marketplace Settings](/desk/marketplace-settings).", "Update Settings", "Open Settings", 1, "Marketplace Settings"),
    ("Set Up Delivery Zones", "Define where you deliver", "Group counties and towns into delivery zones so couriers can be priced per zone.", "Create Entry", "Add Delivery Zone", 0, "Delivery Zone"),
    ("Add a Courier", "Connect a delivery partner", "Add each courier with its rate card per zone and weight band. Couriers are also Suppliers so their fees post to Accounts Payable.", "Create Entry", "Add Courier", 0, "Courier"),
    ("Onboard a Seller", "Register a tenant as a seller", "Link a tenant customer, verify KYC and payout accounts, then approve the seller. See [Sellers](/desk/marketplace-seller).", "Create Entry", "Add Seller", 0, "Marketplace Seller"),
    ("Review a Listing", "Approve a product to go live", "Sellers list products from the tenant portal. Approve them here before they appear to buyers.", "Create Entry", "Add Listing", 0, "Marketplace Listing"),
]


def onboarding():
    module = "Marketplace"
    title = "Marketplace Onboarding"
    steps = []
    for index, (name, step_title, description, action, label, single, reference) in enumerate(ONBOARDING_STEPS):
        write(
            os.path.join(module_dir(module), "onboarding_step", scrub(name), f"{scrub(name)}.json"),
            {
                **BASE,
                "name": name,
                "idx": 0,
                "title": step_title,
                "is_complete": 0,
                "is_skipped": 0,
                "description": description,
                "action": action,
                "action_label": label,
                "show_full_form": 1,
                "show_form_tour": 0,
                "is_single": single,
                "validate_action": 1,
                "doctype": "Onboarding Step",
                "reference_document": reference,
            },
        )
        steps.append(child(title, "Module Onboarding", "steps", index + 1, "Onboarding Step Map", {"step": name, "is_optional": 0}))
    data = {
        **BASE,
        "name": title,
        "idx": 0,
        "title": "Get your marketplace trading",
        "module": module,
        "is_complete": 0,
        "doctype": "Module Onboarding",
        "allow_roles": [child(title, "Module Onboarding", "allow_roles", i + 1, "Onboarding Permission", {"role": r}) for i, r in enumerate(["Marketplace Manager", "System Manager"])],
        "steps": steps,
    }
    write(os.path.join(module_dir(module), "module_onboarding", scrub(title), f"{scrub(title)}.json"), data)


def main():
    for module in MODULES:
        folder = module_dir(module)
        for sub in ("workspace", "sidebar", "number_card", "dashboard_chart", "report", "dashboard", "module_onboarding", "onboarding_step"):
            shutil.rmtree(os.path.join(folder, sub), ignore_errors=True)
        os.makedirs(folder, exist_ok=True)
        init = os.path.join(folder, "__init__.py")
        if not os.path.exists(init):
            write(init, text="")
    shutil.rmtree(os.path.join(APP, "dock"), ignore_errors=True)
    for module in MODULES:
        for card in CARDS[module]:
            number_card(module, card[0], card[1], card[2], card[3], card[4] and [(f, op, v) for f, op, v in card[4]], card[5])
        for chart in CHARTS[module]:
            dashboard_chart(module, *chart)
        workspace(module)
        sidebar(module)
    for report in REPORTS:
        report_files(report)
    wallet = {"name": "Wallet Liability", "module": "Seller Wallet", "ref_doctype": "Marketplace Seller", "total": 1}
    report_files(wallet)
    dock()
    dashboard()
    onboarding()
    print("artifacts written")


if __name__ == "__main__":
    main()
