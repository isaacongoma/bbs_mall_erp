from mdsl import CB, F, SB, TB, doctype
from defs_catalog import BUYER_TYPES, PAYMENT_METHODS

ORDER_STATUS = "Pending Payment\nPaid\nProcessing\nPartially Shipped\nShipped\nDelivered\nCompleted\nCancelled\nRefunded\nFailed"
PAYMENT_STATUS = "Unpaid\nPending\nPaid\nPartially Refunded\nRefunded\nFailed"
SELLER_ORDER_STATUS = "New\nAccepted\nPacked\nShipped\nDelivered\nCompleted\nCancelled\nReturned"
SETTLEMENT = "Unsettled\nHeld\nSettled\nReversed"
RETURN_REASONS = "Damaged on Arrival\nWrong Item\nNot as Described\nFaulty\nChanged Mind\nLate Delivery\nMissing Parts\nOther"


def with_series(meta, options):
    meta["fields"].insert(0, F("naming_series", "Select", "Series", options=options, default=options, hidden=1))
    meta["field_order"] = [field["fieldname"] for field in meta["fields"]]
    meta["autoname"] = "naming_series:"
    meta["naming_rule"] = 'By "Naming Series" field'
    return meta


def defs():
    out = []

    out.append(doctype(
        "Order Status Event",
        [
            F("status", "Data", "Status", in_list_view=1),
            F("at", "Datetime", "When", in_list_view=1),
            F("by", "Link", "By", options="User", in_list_view=1),
            F("note", "Small Text", "Note", in_list_view=1),
        ],
        istable=1,
    ))

    out.append(doctype(
        "Marketplace Cart Item",
        [
            F("listing", "Link", "Listing", options="Marketplace Listing", reqd=1, in_list_view=1),
            F("variant_item", "Link", "Variant", options="Item"),
            F("item_name", "Data", "Name", fetch_from="listing.listing_title", read_only=1, in_list_view=1),
            F("seller", "Link", "Seller", options="Marketplace Seller", fetch_from="listing.seller", read_only=1),
            F("qty", "Float", "Qty", default="1", reqd=1, in_list_view=1),
            F("rate", "Currency", "Rate", read_only=1, in_list_view=1),
            F("amount", "Currency", "Amount", read_only=1, in_list_view=1),
        ],
        istable=1,
    ))
    out.append(with_series(doctype(
        "Marketplace Cart",
        [
            F("customer", "Link", "Customer", options="Customer", in_list_view=1, in_standard_filter=1),
            F("session_key", "Data", "Guest Session", in_standard_filter=1),
            F("buyer_type", "Select", "Buyer Type", options=BUYER_TYPES, default="B2C", in_list_view=1),
            F("status", "Select", "Status", options="Active\nConverted\nAbandoned", default="Active", in_list_view=1, in_standard_filter=1),
            CB(),
            F("coupon_code", "Link", "Coupon", options="Coupon Code"),
            F("delivery_zone", "Link", "Delivery Zone", options="Delivery Zone"),
            F("subtotal", "Currency", "Subtotal", read_only=1),
            F("last_activity", "Datetime", "Last Activity", read_only=1),
            F("reminder_count", "Int", "Reminders Sent", read_only=1, no_copy=1),
            F("last_reminder_on", "Datetime", "Last Reminder", read_only=1, no_copy=1),
            SB("Items", "items_section"),
            F("items", "Table", "Items", options="Marketplace Cart Item"),
        ],
        kind="operations",
        sort_field="modified",
    ), "CART-.YYYY.-"))

    out.append(doctype(
        "Marketplace Order Item",
        [
            F("listing", "Link", "Listing", options="Marketplace Listing", reqd=1, in_list_view=1),
            F("variant_item", "Link", "Variant", options="Item", read_only=1),
            F("variant_label", "Data", "Options", read_only=1),
            F("item_code", "Link", "Item", options="Item", read_only=1),
            F("item_name", "Data", "Name", in_list_view=1),
            F("seller", "Link", "Seller", options="Marketplace Seller", read_only=1, in_list_view=1),
            F("seller_order", "Link", "Seller Order", options="Seller Order", read_only=1),
            F("qty", "Float", "Qty", reqd=1, in_list_view=1),
            F("uom", "Link", "UOM", options="UOM"),
            F("rate", "Currency", "Rate (excl. VAT)", in_list_view=1),
            F("vat_rate", "Percent", "VAT %"),
            F("vat_amount", "Currency", "VAT", read_only=1),
            F("discount_amount", "Currency", "Discount", read_only=1),
            F("amount", "Currency", "Amount (incl. VAT)", read_only=1, in_list_view=1),
            F("returned_qty", "Float", "Returned", read_only=1),
            F("voucher_discount", "Currency", "Voucher Discount", read_only=1),
            F("download_count", "Int", "Downloads", read_only=1, no_copy=1),
            F("status", "Data", "Status", read_only=1),
        ],
        istable=1,
    ))

    order = doctype(
        "Marketplace Order",
        [
            F("customer", "Link", "Customer", options="Customer", reqd=1, in_list_view=1, in_standard_filter=1),
            F("buyer_type", "Select", "Buyer Type", options=BUYER_TYPES, default="B2C", in_list_view=1, in_standard_filter=1),
            F("order_date", "Datetime", "Order Date", reqd=1, in_list_view=1),
            F("source", "Select", "Source", options="Website\nMobile App\nAdmin\nAPI\nPhone", default="Website"),
            CB(),
            F("status", "Select", "Status", options=ORDER_STATUS, default="Pending Payment", in_list_view=1, in_standard_filter=1),
            F("payment_status", "Select", "Payment", options=PAYMENT_STATUS, default="Unpaid", in_list_view=1, in_standard_filter=1),
            F("payment_method", "Select", "Payment Method", options=PAYMENT_METHODS),
            F("company", "Link", "Company", options="Company", reqd=1),
            SB("Delivery", "delivery_section"),
            F("recipient_name", "Data", "Recipient"),
            F("recipient_phone", "Data", "Phone", options="Phone"),
            F("shipping_address", "Link", "Address", options="Address"),
            F("address_snapshot", "Small Text", "Delivery Address"),
            CB(),
            F("delivery_zone", "Link", "Delivery Zone", options="Delivery Zone"),
            F("delivery_method", "Select", "Delivery Method", options="Courier Delivery\nStation Pickup\nSeller Delivery\nMall Collection", default="Courier Delivery"),
            F("pickup_station", "Link", "Pickup Station", options="Pickup Station"),
            F("delivery_notes", "Small Text", "Delivery Notes"),
            SB("Items", "items_section"),
            F("items", "Table", "Items", options="Marketplace Order Item", reqd=1),
            SB("Totals", "totals_section"),
            F("subtotal", "Currency", "Subtotal (excl. VAT)", read_only=1),
            F("vat_total", "Currency", "VAT", read_only=1),
            F("discount_total", "Currency", "Discount", read_only=1),
            CB(),
            F("shipping_total", "Currency", "Delivery Fee", read_only=1),
            F("shipping_discount", "Currency", "Delivery Discount (Voucher)", read_only=1),
            F("grand_total", "Currency", "Grand Total", read_only=1, in_list_view=1),
            F("paid_amount", "Currency", "Paid", read_only=1),
            F("outstanding_amount", "Currency", "Balance", read_only=1),
            SB("Promotions", "promo_section", collapsible=1),
            F("coupon_code", "Link", "Coupon", options="Coupon Code"),
            F("platform_discount", "Currency", "Platform Funded Discount", read_only=1),
            CB(),
            F("seller_discount", "Currency", "Seller Funded Discount", read_only=1),
            SB("Business Buyer", "b2b_section", collapsible=1, depends_on="eval:doc.buyer_type=='B2B'"),
            F("purchase_order_no", "Data", "Buyer PO No"),
            F("payment_terms_template", "Link", "Credit Terms", options="Payment Terms Template"),
            F("kra_pin", "Data", "Buyer KRA PIN"),
            CB(),
            F("business_name", "Data", "Business Name"),
            F("invoice_required", "Check", "Tax Invoice Required"),
            SB("Links", "links_section", collapsible=1),
            F("sales_order", "Link", "Sales Order (Own Stock)", options="Sales Order", read_only=1, no_copy=1),
            F("sales_invoice", "Link", "Sales Invoice (Own Stock)", options="Sales Invoice", read_only=1, no_copy=1),
            F("cancel_reason", "Small Text", "Cancellation Reason"),
            F("status_log", "Table", "Status Log", options="Order Status Event", read_only=1),
        ],
        kind="operations",
        title_field="customer",
        search_fields="customer,status,payment_status,buyer_type",
        sort_field="modified",
        links=[],
    )
    out.append(with_series(order, "MKT-.YYYY.-"))

    out.append(doctype(
        "Seller Order Item",
        [
            F("listing", "Link", "Listing", options="Marketplace Listing", reqd=1, in_list_view=1),
            F("variant_item", "Link", "Variant", options="Item", read_only=1),
            F("variant_label", "Data", "Options", read_only=1),
            F("item_code", "Link", "Item", options="Item", read_only=1),
            F("item_name", "Data", "Name", in_list_view=1),
            F("qty", "Float", "Qty", reqd=1, in_list_view=1),
            F("rate", "Currency", "Rate", in_list_view=1),
            F("vat_rate", "Percent", "VAT %"),
            F("vat_amount", "Currency", "VAT"),
            F("amount", "Currency", "Amount", in_list_view=1),
            F("commission_rate", "Percent", "Commission %", read_only=1),
            F("commission", "Currency", "Commission", read_only=1, in_list_view=1),
            F("returned_qty", "Float", "Returned", read_only=1),
        ],
        istable=1,
    ))

    seller_order = doctype(
        "Seller Order",
        [
            F("marketplace_order", "Link", "Order", options="Marketplace Order", reqd=1, in_list_view=1, in_standard_filter=1, set_only_once=1),
            F("seller", "Link", "Seller", options="Marketplace Seller", reqd=1, in_list_view=1, in_standard_filter=1, set_only_once=1),
            F("customer", "Link", "Buyer", options="Customer", fetch_from="marketplace_order.customer", read_only=1, in_list_view=1),
            F("buyer_type", "Data", "Buyer Type", fetch_from="marketplace_order.buyer_type", read_only=1),
            CB(),
            F("status", "Select", "Status", options=SELLER_ORDER_STATUS, default="New", in_list_view=1, in_standard_filter=1),
            F("settlement_status", "Select", "Settlement", options=SETTLEMENT, default="Unsettled", in_list_view=1, in_standard_filter=1, read_only=1),
            F("fulfilment_mode", "Select", "Fulfilment", options="Seller Ships\nPlatform Fulfils\nSeller Drops at Station"),
            F("sla_due", "Datetime", "Action Due By", read_only=1, in_list_view=1),
            SB("Items", "items_section"),
            F("items", "Table", "Items", options="Seller Order Item", reqd=1),
            SB("Amounts", "amounts_section"),
            F("items_total", "Currency", "Items Total (incl. VAT)", read_only=1),
            F("vat_total", "Currency", "VAT in Items", read_only=1),
            F("seller_discount", "Currency", "Seller Funded Discount", read_only=1),
            F("platform_discount", "Currency", "Platform Funded Discount", read_only=1),
            CB(),
            F("shipping_fee", "Currency", "Delivery Fee Charged", read_only=1),
            F("shipping_discount", "Currency", "Delivery Discount (Voucher)", read_only=1),
            F("shipping_subsidy", "Currency", "Delivery Discount Paid by Seller", read_only=1),
            F("commission_rate", "Percent", "Commission %", read_only=1),
            F("commission_amount", "Currency", "Commission", read_only=1),
            F("commission_vat", "Currency", "VAT on Commission", read_only=1),
            F("seller_net", "Currency", "Seller Receives", read_only=1, in_list_view=1),
            SB("Settlement", "settlement_section", collapsible=1),
            F("settle_on", "Date", "Funds Available On", read_only=1),
            F("settled_on", "Datetime", "Posted On", read_only=1),
            F("journal_entry", "Link", "Settlement Journal", options="Journal Entry", read_only=1, no_copy=1),
            CB(),
            F("reversal_journal", "Link", "Reversal Journal", options="Journal Entry", read_only=1, no_copy=1),
            F("wallet_transaction", "Link", "Wallet Entry", options="Seller Wallet Transaction", read_only=1, no_copy=1),
            SB("Fulfilment", "fulfilment_section"),
            F("courier", "Link", "Courier", options="Courier"),
            F("shipment", "Link", "Shipment", options="Marketplace Shipment", read_only=1, no_copy=1),
            F("accepted_on", "Datetime", "Accepted", read_only=1),
            F("packed_on", "Datetime", "Packed", read_only=1),
            CB(),
            F("shipped_on", "Datetime", "Shipped", read_only=1),
            F("delivered_on", "Datetime", "Delivered", read_only=1),
            F("cancel_reason", "Small Text", "Cancellation Reason"),
            F("status_log", "Table", "Status Log", options="Order Status Event", read_only=1),
        ],
        kind="operations",
        search_fields="marketplace_order,seller,status",
        sort_field="modified",
    )
    out.append(with_series(seller_order, "SOR-.YYYY.-"))

    out.append(doctype(
        "Marketplace Payment",
        [
            F("marketplace_order", "Link", "Order", options="Marketplace Order", reqd=1, in_list_view=1, in_standard_filter=1),
            F("customer", "Link", "Customer", options="Customer", fetch_from="marketplace_order.customer", read_only=1, in_list_view=1),
            F("method", "Select", "Method", options=PAYMENT_METHODS, reqd=1, in_list_view=1, in_standard_filter=1),
            F("amount", "Currency", "Amount", reqd=1, in_list_view=1),
            CB(),
            F("status", "Select", "Status", options="Initiated\nPending\nPaid\nFailed\nCancelled\nExpired\nRefunded", default="Initiated", in_list_view=1, in_standard_filter=1),
            F("phone", "Data", "Phone", options="Phone"),
            F("paid_on", "Datetime", "Paid On", read_only=1),
            SB("Gateway", "gateway_section"),
            F("merchant_request_id", "Data", "Merchant Request ID", read_only=1, search_index=1),
            F("checkout_request_id", "Data", "Checkout Request ID", read_only=1, search_index=1),
            F("gateway_receipt", "Data", "Receipt No", read_only=1, in_list_view=1, search_index=1),
            CB(),
            F("fee_amount", "Currency", "Gateway Fee", read_only=1),
            F("failure_reason", "Small Text", "Failure Reason", read_only=1),
            SB("Accounting", "accounting_section", collapsible=1),
            F("payment_entry", "Link", "Payment Entry", options="Payment Entry", read_only=1, no_copy=1),
            F("company", "Link", "Company", options="Company"),
            SB("Raw", "raw_section", collapsible=1),
            F("request_payload", "Code", "Request", read_only=1),
            F("response_payload", "Code", "Response", read_only=1),
        ],
        kind="finance",
        autoname="naming_series:",
        naming_rule='By "Naming Series" field',
        sort_field="modified",
    ))
    out[-1]["fields"].insert(0, F("naming_series", "Select", "Series", options="MPAY-.YYYY.-", default="MPAY-.YYYY.-", hidden=1))
    out[-1]["field_order"] = [field["fieldname"] for field in out[-1]["fields"]]

    out.append(doctype(
        "Return Request Item",
        [
            F("order_item", "Data", "Order Item Row", reqd=1),
            F("listing", "Link", "Listing", options="Marketplace Listing", read_only=1, in_list_view=1),
            F("item_name", "Data", "Item", read_only=1, in_list_view=1),
            F("qty", "Float", "Return Qty", reqd=1, in_list_view=1),
            F("item_condition", "Select", "Condition", options="Unopened\nOpened\nDamaged\nDefective", default="Opened", in_list_view=1),
            F("refund_amount", "Currency", "Refund", in_list_view=1),
            F("restock", "Check", "Return to Stock"),
        ],
        istable=1,
    ))
    ret = doctype(
        "Return Request",
        [
            F("marketplace_order", "Link", "Order", options="Marketplace Order", reqd=1, in_list_view=1, in_standard_filter=1),
            F("seller_order", "Link", "Seller Order", options="Seller Order", reqd=1, in_list_view=1),
            F("customer", "Link", "Buyer", options="Customer", fetch_from="marketplace_order.customer", read_only=1),
            F("seller", "Link", "Seller", options="Marketplace Seller", fetch_from="seller_order.seller", read_only=1, in_standard_filter=1),
            CB(),
            F("status", "Select", "Status", options="Requested\nApproved\nRejected\nPickup Scheduled\nReceived\nRefunded\nClosed", default="Requested", in_list_view=1, in_standard_filter=1),
            F("reason", "Select", "Reason", options=RETURN_REASONS, reqd=1, in_list_view=1),
            F("resolution", "Select", "Resolution", options="Refund\nReplacement\nStore Credit", default="Refund"),
            F("seller_liable", "Check", "Seller Liable", description="Refund comes out of the seller's wallet when set"),
            SB("Details", "details_section"),
            F("details", "Small Text", "Buyer's Description"),
            F("evidence", "Attach Image", "Photo Evidence"),
            F("items", "Table", "Items", options="Return Request Item", reqd=1),
            SB("Refund", "refund_section"),
            F("refund_amount", "Currency", "Refund Amount", read_only=1, in_list_view=1),
            F("refund_method", "Select", "Refund To", options="Original Method\nM-Pesa\nBank Transfer\nBuyer Store Credit"),
            F("refund_phone", "Data", "Refund Phone"),
            CB(),
            F("reverse_journal", "Link", "Reversal Journal", options="Journal Entry", read_only=1, no_copy=1),
            F("refund_entry", "Link", "Refund Payment", options="Payment Entry", read_only=1, no_copy=1),
            F("credit_note", "Link", "Credit Note (Own Stock)", options="Sales Invoice", read_only=1, no_copy=1),
            F("decision_note", "Small Text", "Decision Note"),
            F("decided_by", "Link", "Decided By", options="User", read_only=1),
            F("status_log", "Table", "Status Log", options="Order Status Event", read_only=1),
        ],
        kind="operations",
        sort_field="modified",
    )
    out.append(with_series(ret, "RMA-.YYYY.-"))
    return out
