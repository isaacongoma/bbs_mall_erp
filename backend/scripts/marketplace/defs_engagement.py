from mdsl import CB, F, SB, doctype
from defs_orders import with_series

DAYS = "Monday\nTuesday\nWednesday\nThursday\nFriday\nSaturday\nSunday"

BUYER_EVENTS = [
    "Abandoned Cart Reminder",
    "Order Placed",
    "Payment Received",
    "Payment Failed",
    "Order Partially Shipped",
    "Order Shipped",
    "Out for Delivery",
    "Order Delivered",
    "Delivery Failed",
    "Order Cancelled",
    "Order Refunded",
    "Return Requested",
    "Return Approved",
    "Return Rejected",
    "Return Received",
    "Refund Issued",
]
SELLER_EVENTS = [
    "New Order for Seller",
    "Seller Order Cancelled",
    "Seller Return Request",
    "Withdrawal Requested",
    "Withdrawal Paid",
    "Withdrawal Failed",
    "Listing Approved",
    "Listing Rejected",
    "Seller Approved",
    "Seller Suspended",
    "Late Order Warning",
    "Low Stock Alert",
    "Subscription Activated",
    "Ad Activated",
]
STAFF_EVENTS = ["Seller Application Received", "Listing Awaiting Review", "Withdrawal Awaiting Approval"]
ALL_EVENTS = BUYER_EVENTS + SELLER_EVENTS + STAFF_EVENTS


def defs():
    out = []

    out.append(doctype("Seller Working Hours", [
        F("day", "Select", "Day", options=DAYS, reqd=1, in_list_view=1),
        F("is_closed", "Check", "Closed", in_list_view=1),
        F("opens_at", "Time", "Opens", in_list_view=1),
        F("closes_at", "Time", "Closes", in_list_view=1),
    ], istable=1))
    out.append(doctype("Seller Closed Date", [
        F("date", "Date", "Date", reqd=1, in_list_view=1),
        F("reason", "Data", "Reason", in_list_view=1),
    ], istable=1))
    out.append(doctype("Seller Social Link", [
        F("platform", "Select", "Platform", options="Website\nFacebook\nInstagram\nX\nTikTok\nYouTube\nWhatsApp", reqd=1, in_list_view=1),
        F("url", "Data", "Link", reqd=1, in_list_view=1),
    ], istable=1))
    out.append(doctype("Seller Gallery Image", [
        F("image", "Attach Image", "Image", reqd=1, in_list_view=1),
        F("caption", "Data", "Caption", in_list_view=1),
    ], istable=1))
    out.append(doctype("Seller Tag", [F("tag", "Data", "Tag", reqd=1, in_list_view=1)], istable=1))
    out.append(doctype("Listing Digital File", [
        F("title", "Data", "Title", reqd=1, in_list_view=1),
        F("file", "Attach", "File", reqd=1, in_list_view=1),
        F("version", "Data", "Version", in_list_view=1),
    ], istable=1))

    out.append(doctype("Category Attribute", [
        F("attribute", "Link", "Attribute", options="Item Attribute", reqd=1, in_list_view=1),
        F("use_for_variants", "Check", "Buyers Choose Between Values", in_list_view=1),
        F("filterable", "Check", "Show as Filter", default="1", in_list_view=1),
        F("required", "Check", "Required for Sellers", in_list_view=1),
    ], istable=1))

    out.append(doctype("Size Chart Row", [
        F("size_label", "Data", "Size", reqd=1, in_list_view=1),
        F("measurements", "Small Text", "Measurements", description="For example Chest 96 cm, Waist 80 cm", in_list_view=1),
    ], istable=1))
    out.append(doctype(
        "Marketplace Size Chart",
        [
            F("chart_name", "Data", "Chart", reqd=1, unique=1, in_list_view=1),
            F("seller", "Link", "Seller", options="Marketplace Seller", description="Leave empty for a marketplace-wide chart", in_list_view=1),
            F("item_group", "Link", "Category", options="Item Group"),
            F("unit", "Select", "Unit", options="cm\ninch", default="cm"),
            F("notes", "Small Text", "Notes"),
            F("rows", "Table", "Sizes", options="Size Chart Row"),
        ],
        kind="catalog",
        autoname="field:chart_name",
        naming_rule="By fieldname",
        title_field="chart_name",
        sort_field="modified",
    ))
    out.append(doctype("Listing Bundle Item", [
        F("listing", "Link", "Product", options="Marketplace Listing", reqd=1, in_list_view=1),
        F("title", "Data", "Title", fetch_from="listing.listing_title", read_only=1, in_list_view=1),
    ], istable=1))

    out.append(doctype(
        "Product Question",
        [
            F("listing", "Link", "Product", options="Marketplace Listing", reqd=1, in_list_view=1, in_standard_filter=1),
            F("seller", "Link", "Seller", options="Marketplace Seller", fetch_from="listing.seller", read_only=1, in_standard_filter=1),
            F("customer", "Link", "Asked By", options="Customer", in_list_view=1),
            F("status", "Select", "Status", options="Pending\nAnswered\nHidden", default="Pending", in_list_view=1, in_standard_filter=1),
            F("question", "Small Text", "Question", reqd=1, in_list_view=1),
            F("answer", "Small Text", "Answer"),
            F("answered_by", "Link", "Answered By", options="User", read_only=1),
            F("answered_on", "Datetime", "Answered On", read_only=1),
        ],
        kind="operations",
        autoname="hash",
        naming_rule="Random",
        title_field="question",
        sort_field="modified",
    ))
    out.append(doctype(
        "Marketplace Seller Follow",
        [
            F("customer", "Link", "Customer", options="Customer", reqd=1, in_list_view=1, in_standard_filter=1),
            F("seller", "Link", "Seller", options="Marketplace Seller", reqd=1, in_list_view=1, in_standard_filter=1),
        ],
        kind="readonly",
        autoname="hash",
        naming_rule="Random",
        sort_field="modified",
    ))
    out.append(doctype(
        "Recently Viewed Product",
        [
            F("customer", "Link", "Customer", options="Customer", reqd=1, in_standard_filter=1),
            F("listing", "Link", "Product", options="Marketplace Listing", reqd=1, in_list_view=1),
            F("viewed_on", "Datetime", "Viewed On", in_list_view=1),
        ],
        kind="readonly",
        autoname="hash",
        naming_rule="Random",
        sort_field="modified",
    ))
    out.append(doctype(
        "Seller Notice",
        [
            F("title", "Data", "Title", reqd=1, in_list_view=1),
            F("audience", "Select", "For", options="All Sellers\nSelected Sellers", default="All Sellers", in_list_view=1),
            F("seller", "Link", "Seller", options="Marketplace Seller", depends_on="eval:doc.audience=='Selected Sellers'"),
            F("published", "Check", "Published", default="1", in_list_view=1),
            F("publish_on", "Datetime", "Publish On"),
            F("message", "Text Editor", "Message", reqd=1),
        ],
        kind="operations",
        autoname="hash",
        naming_rule="Random",
        title_field="title",
        sort_field="modified",
    ))
    out.append(doctype(
        "Seller Plan",
        [
            F("plan_name", "Data", "Plan", reqd=1, unique=1, in_list_view=1),
            F("enabled", "Check", "Enabled", default="1", in_list_view=1),
            F("is_default", "Check", "Default Plan for New Sellers"),
            CB(),
            F("monthly_fee", "Currency", "Monthly Fee (excl. VAT)", in_list_view=1),
            F("annual_fee", "Currency", "Annual Fee (excl. VAT)", in_list_view=1),
            SB("Allowances", "allowance_section"),
            F("listing_limit", "Int", "Listings Allowed", description="0 means unlimited", in_list_view=1),
            F("commission_rate", "Percent", "Commission % Override", description="Leave empty to use the marketplace commission rules"),
            F("featured_slots", "Int", "Sponsored Listings Included"),
            F("description", "Small Text", "Description"),
        ],
        kind="catalog",
        autoname="field:plan_name",
        naming_rule="By fieldname",
        title_field="plan_name",
        sort_field="modified",
    ))
    subscription = doctype(
        "Seller Subscription",
        [
            F("seller", "Link", "Seller", options="Marketplace Seller", reqd=1, in_list_view=1, in_standard_filter=1),
            F("plan", "Link", "Plan", options="Seller Plan", reqd=1, in_list_view=1),
            F("billing_period", "Select", "Billing", options="Monthly\nAnnual", default="Monthly", in_list_view=1),
            F("status", "Select", "Status", options="Pending Payment\nActive\nExpired\nCancelled", default="Pending Payment", in_list_view=1, in_standard_filter=1),
            CB(),
            F("start_date", "Date", "Starts", in_list_view=1),
            F("end_date", "Date", "Ends", in_list_view=1),
            F("auto_renew", "Check", "Renew Automatically", default="1"),
            SB("Charge", "charge_section"),
            F("amount", "Currency", "Fee", read_only=1),
            F("vat_amount", "Currency", "VAT", read_only=1),
            F("total", "Currency", "Total", read_only=1),
            CB(),
            F("paid_on", "Date", "Paid On", read_only=1, no_copy=1),
            F("journal_entry", "Link", "Journal Entry", options="Journal Entry", read_only=1, no_copy=1),
        ],
        kind="finance",
        title_field="plan",
        sort_field="modified",
    )
    out.append(with_series(subscription, "SSUB-.YYYY.-"))

    out.append(doctype(
        "Ad Package",
        [
            F("package_name", "Data", "Package", reqd=1, unique=1, in_list_view=1),
            F("enabled", "Check", "Enabled", default="1", in_list_view=1),
            F("placement", "Select", "Placement", options="Search Boost\nCategory Top\nHome Featured\nHome Banner", default="Search Boost", reqd=1, in_list_view=1),
            CB(),
            F("price", "Currency", "Price (excl. VAT)", reqd=1, in_list_view=1),
            F("duration_days", "Int", "Duration (days)", reqd=1, default="7", in_list_view=1),
            F("max_listings", "Int", "Listings Covered", default="1", in_list_view=1),
            F("description", "Small Text", "Description"),
        ],
        kind="catalog",
        autoname="field:package_name",
        naming_rule="By fieldname",
        title_field="package_name",
        sort_field="modified",
    ))
    out.append(doctype("Seller Ad Listing", [F("listing", "Link", "Listing", options="Marketplace Listing", reqd=1, in_list_view=1)], istable=1))
    ad = doctype(
        "Seller Ad",
        [
            F("seller", "Link", "Seller", options="Marketplace Seller", reqd=1, in_list_view=1, in_standard_filter=1),
            F("package", "Link", "Package", options="Ad Package", reqd=1, in_list_view=1),
            F("status", "Select", "Status", options="Pending Payment\nActive\nExpired\nCancelled", default="Pending Payment", in_list_view=1, in_standard_filter=1),
            CB(),
            F("start_date", "Date", "Starts", in_list_view=1),
            F("end_date", "Date", "Ends", in_list_view=1),
            SB("Listings", "ad_listings_section"),
            F("listings", "Table", "Listings", options="Seller Ad Listing"),
            SB("Charge", "charge_section"),
            F("amount", "Currency", "Price", read_only=1),
            F("vat_amount", "Currency", "VAT", read_only=1),
            F("total", "Currency", "Total", read_only=1),
            CB(),
            F("paid_on", "Date", "Paid On", read_only=1, no_copy=1),
            F("journal_entry", "Link", "Journal Entry", options="Journal Entry", read_only=1, no_copy=1),
        ],
        kind="finance",
        title_field="package",
        sort_field="modified",
    )
    out.append(with_series(ad, "SAD-.YYYY.-"))

    out.append(doctype(
        "Marketplace Wishlist Item",
        [
            F("customer", "Link", "Customer", options="Customer", reqd=1, in_list_view=1, in_standard_filter=1),
            F("listing", "Link", "Listing", options="Marketplace Listing", reqd=1, in_list_view=1, in_standard_filter=1),
            F("added_on", "Datetime", "Added On", read_only=1, in_list_view=1),
        ],
        kind="readonly",
        autoname="hash",
        naming_rule="Random",
        sort_field="modified",
    ))

    out.append(doctype(
        "Marketplace FAQ",
        [
            F("question", "Data", "Question", reqd=1, in_list_view=1),
            F("category", "Select", "Category", options="General\nOrders\nPayments\nDelivery\nReturns\nSelling", default="General", in_list_view=1, in_standard_filter=1),
            F("published", "Check", "Published", default="1", in_list_view=1),
            F("sort_order", "Int", "Order", in_list_view=1),
            F("answer", "Text Editor", "Answer", reqd=1),
        ],
        kind="catalog",
        autoname="hash",
        naming_rule="Random",
        title_field="question",
        sort_field="sort_order",
        sort_order="ASC",
    ))

    out.append(doctype(
        "Marketplace Notification Template",
        [
            F("event_name", "Select", "Event", options="\n".join(ALL_EVENTS), reqd=1, unique=1, in_list_view=1),
            F("audience", "Select", "Sent To", options="Buyer\nSeller\nStaff", reqd=1, in_list_view=1, in_standard_filter=1),
            F("enabled", "Check", "Enabled", default="1", in_list_view=1),
            CB(),
            F("send_email", "Check", "Send Email", default="1", in_list_view=1),
            F("send_sms", "Check", "Send SMS", default="1", in_list_view=1),
            SB("Email", "email_section"),
            F("email_subject", "Data", "Subject"),
            F("email_body", "Text Editor", "Message", description="Jinja. Available: order, doc, customer_name, seller_name, tracking_no, tracking_url, order_url, brand, support_phone, amount"),
            SB("SMS", "sms_section"),
            F("sms_body", "Small Text", "Text", description="Keep it under 160 characters. Same variables as the email"),
        ],
        kind="operations",
        autoname="field:event_name",
        naming_rule="By fieldname",
        title_field="event_name",
        sort_field="modified",
    ))
    log = doctype(
        "Marketplace Notification Log",
        [
            F("event_name", "Data", "Event", in_list_view=1, in_standard_filter=1),
            F("audience", "Data", "Sent To", in_list_view=1),
            F("channel", "Select", "Channel", options="Email\nSMS", in_list_view=1, in_standard_filter=1),
            F("status", "Select", "Status", options="Queued\nSent\nFailed\nSkipped", default="Queued", in_list_view=1, in_standard_filter=1),
            CB(),
            F("recipient", "Data", "Recipient", in_list_view=1),
            F("reference_doctype", "Link", "Reference Type", options="DocType"),
            F("reference_name", "Dynamic Link", "Reference", options="reference_doctype", in_list_view=1),
            F("sent_on", "Datetime", "Sent On"),
            SB("Content", "content_section"),
            F("subject", "Data", "Subject"),
            F("message", "Long Text", "Message"),
            F("error", "Small Text", "Error"),
        ],
        kind="readonly",
        title_field="event_name",
        sort_field="creation",
    )
    out.append(with_series(log, "NTF-.YYYY.-"))
    return out
