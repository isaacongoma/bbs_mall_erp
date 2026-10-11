from mdsl import CB, F, SB, TB, doctype
from defs_orders import with_series

SHIP_STATUS = "Pending\nPickup Scheduled\nPicked Up\nIn Transit\nOut for Delivery\nDelivered\nFailed Delivery\nReturning\nReturned to Seller\nCancelled"


def defs():
    out = []

    out.append(doctype(
        "Delivery Zone Area",
        [
            F("county", "Data", "County", in_list_view=1),
            F("town", "Data", "Town or Estate", in_list_view=1),
            F("territory", "Link", "Territory", options="Territory", in_list_view=1),
        ],
        istable=1,
    ))
    out.append(doctype(
        "Delivery Zone",
        [
            F("zone_name", "Data", "Zone", reqd=1, in_list_view=1, unique=1),
            F("enabled", "Check", "Enabled", default="1", in_list_view=1),
            F("free_delivery_above", "Currency", "Free Delivery Above", description="Order value above which the delivery fee is waived"),
            CB(),
            F("b2b_only", "Check", "B2B Only"),
            F("is_pickup_only", "Check", "Station Pickup Only"),
            SB("Coverage", "coverage_section"),
            F("areas", "Table", "Areas Covered", options="Delivery Zone Area"),
        ],
        kind="operations",
        autoname="field:zone_name",
        naming_rule="By fieldname",
        title_field="zone_name",
        sort_field="modified",
    ))

    out.append(doctype(
        "Courier Rate",
        [
            F("zone", "Link", "Zone", options="Delivery Zone", reqd=1, in_list_view=1),
            F("service_level", "Select", "Service", options="Standard\nExpress\nSame Day\nFreight", default="Standard", in_list_view=1),
            F("min_weight", "Float", "From kg", default="0"),
            F("max_weight", "Float", "Up To kg", in_list_view=1),
            F("base_rate", "Currency", "Base Rate", reqd=1, in_list_view=1),
            F("per_kg_rate", "Currency", "Per Extra kg", in_list_view=1),
            F("eta_days_min", "Int", "ETA From (days)"),
            F("eta_days_max", "Int", "ETA To (days)"),
            F("cod_fee_percent", "Percent", "COD Fee %"),
        ],
        istable=1,
    ))
    out.append(doctype(
        "Courier",
        [
            F("courier_name", "Data", "Courier", reqd=1, in_list_view=1, unique=1),
            F("courier_type", "Select", "Type", options="Third Party\nOwn Fleet\nSeller Delivery\nStation Network", default="Third Party", in_list_view=1, in_standard_filter=1),
            F("enabled", "Check", "Enabled", default="1", in_list_view=1),
            F("supplier", "Link", "Supplier", options="Supplier", description="Courier invoices are booked against this supplier"),
            CB(),
            F("cod_supported", "Check", "Cash on Delivery"),
            F("max_weight_kg", "Float", "Maximum Parcel kg"),
            F("insurance_percent", "Percent", "Insurance %"),
            F("tracking_url_template", "Data", "Tracking URL", description="Use {tracking_no} where the number goes"),
            SB("Integration", "integration_section", collapsible=1),
            F("integration", "Select", "Integration", options="Manual\nGeneric REST", default="Manual"),
            F("api_base_url", "Data", "API Base URL", depends_on="eval:doc.integration=='Generic REST'"),
            F("account_id", "Data", "Account ID"),
            CB(),
            F("api_key", "Password", "API Key"),
            F("webhook_token", "Data", "Webhook Token", read_only=1, no_copy=1),
            SB("Rates", "rates_section"),
            F("rates", "Table", "Rate Card", options="Courier Rate"),
        ],
        kind="operations",
        autoname="field:courier_name",
        naming_rule="By fieldname",
        title_field="courier_name",
        sort_field="modified",
    ))

    out.append(doctype(
        "Pickup Station",
        [
            F("station_name", "Data", "Station", reqd=1, in_list_view=1),
            F("courier", "Link", "Operator", options="Courier", in_list_view=1),
            F("enabled", "Check", "Enabled", default="1", in_list_view=1),
            F("county", "Data", "County", in_list_view=1),
            CB(),
            F("zone", "Link", "Zone", options="Delivery Zone"),
            F("phone", "Data", "Phone", options="Phone"),
            F("address", "Small Text", "Address"),
            F("opening_hours", "Data", "Opening Hours"),
            F("latitude", "Float", "Latitude", precision="6"),
            F("longitude", "Float", "Longitude", precision="6"),
        ],
        kind="operations",
        autoname="Prompt",
        naming_rule="Set by user",
        title_field="station_name",
        sort_field="modified",
    ))

    out.append(doctype(
        "Shipment Event",
        [
            F("status", "Data", "Status", in_list_view=1),
            F("at", "Datetime", "When", in_list_view=1),
            F("location", "Data", "Location", in_list_view=1),
            F("note", "Small Text", "Note", in_list_view=1),
            F("source", "Select", "Source", options="System\nCourier\nSeller\nStaff", default="System"),
        ],
        istable=1,
    ))
    ship = doctype(
        "Marketplace Shipment",
        [
            F("seller_order", "Link", "Seller Order", options="Seller Order", reqd=1, in_list_view=1, in_standard_filter=1),
            F("marketplace_order", "Link", "Order", options="Marketplace Order", fetch_from="seller_order.marketplace_order", read_only=1),
            F("seller", "Link", "Seller", options="Marketplace Seller", fetch_from="seller_order.seller", read_only=1, in_standard_filter=1),
            CB(),
            F("status", "Select", "Status", options=SHIP_STATUS, default="Pending", in_list_view=1, in_standard_filter=1),
            F("courier", "Link", "Courier", options="Courier", in_list_view=1, in_standard_filter=1),
            F("service_level", "Select", "Service", options="Standard\nExpress\nSame Day\nFreight", default="Standard"),
            F("tracking_no", "Data", "Tracking No", in_list_view=1, search_index=1),
            SB("Parcel", "parcel_section"),
            F("parcels", "Int", "Parcels", default="1"),
            F("weight_kg", "Float", "Weight (kg)", precision="3"),
            F("declared_value", "Currency", "Declared Value"),
            CB(),
            F("cod_amount", "Currency", "Cash on Delivery"),
            F("cod_collected", "Currency", "COD Collected", read_only=1),
            F("cod_remitted", "Check", "COD Remitted", read_only=1),
            SB("Addresses", "addresses_section"),
            F("pickup_address", "Small Text", "Pickup"),
            F("pickup_station", "Link", "Drop Station", options="Pickup Station"),
            CB(),
            F("recipient_name", "Data", "Recipient"),
            F("recipient_phone", "Data", "Recipient Phone", options="Phone"),
            F("delivery_address", "Small Text", "Deliver To"),
            SB("Costs", "costs_section"),
            F("customer_fee", "Currency", "Fee Charged to Buyer", read_only=1),
            F("courier_cost", "Currency", "Courier Charge"),
            CB(),
            F("purchase_invoice", "Link", "Courier Invoice", options="Purchase Invoice", read_only=1, no_copy=1),
            F("delivery_note", "Link", "Delivery Note (Own Stock)", options="Delivery Note", read_only=1, no_copy=1),
            SB("Timeline", "timeline_section"),
            F("scheduled_pickup", "Datetime", "Pickup Scheduled"),
            F("picked_up_on", "Datetime", "Picked Up", read_only=1),
            CB(),
            F("delivered_on", "Datetime", "Delivered", read_only=1),
            F("proof_of_delivery", "Attach Image", "Proof of Delivery"),
            F("delivery_otp", "Data", "Delivery OTP", read_only=1, no_copy=1, hidden=1),
            F("failure_reason", "Small Text", "Failure Reason"),
            F("events", "Table", "Tracking Events", options="Shipment Event"),
        ],
        kind="operations",
        search_fields="tracking_no,seller_order,courier",
        sort_field="modified",
    )
    out.append(with_series(ship, "SHP-.YYYY.-"))

    out.append(doctype(
        "Campaign Listing",
        [
            F("listing", "Link", "Listing", options="Marketplace Listing", reqd=1, in_list_view=1),
            F("seller", "Link", "Seller", options="Marketplace Seller", fetch_from="listing.seller", read_only=1, in_list_view=1),
            F("discount_type", "Select", "Discount", options="Percent\nAmount", default="Percent", in_list_view=1),
            F("discount_value", "Float", "Value", reqd=1, in_list_view=1),
            F("stock_limit", "Float", "Promo Stock"),
            F("sold_qty", "Float", "Sold", read_only=1),
            F("pricing_rule", "Link", "Pricing Rule", options="Pricing Rule", read_only=1, no_copy=1),
        ],
        istable=1,
    ))
    camp = doctype(
        "Marketplace Campaign",
        [
            F("title", "Data", "Campaign", reqd=1, in_list_view=1),
            F("campaign_type", "Select", "Type", options="Flash Sale\nSeasonal Sale\nFree Delivery\nClearance\nBundle Deal", default="Flash Sale", in_list_view=1),
            F("status", "Select", "Status", options="Draft\nScheduled\nActive\nEnded\nCancelled", default="Draft", in_list_view=1, in_standard_filter=1),
            F("funded_by", "Select", "Funded By", options="Platform\nSeller\nShared", default="Seller", in_list_view=1),
            CB(),
            F("start_date", "Datetime", "Starts", reqd=1, in_list_view=1),
            F("end_date", "Datetime", "Ends", reqd=1, in_list_view=1),
            F("buyer_type", "Select", "Audience", options="Both\nB2C\nB2B", default="Both"),
            F("platform_share_percent", "Percent", "Platform Share %", depends_on="eval:doc.funded_by=='Shared'"),
            SB("Content", "content_section", collapsible=1),
            F("banner", "Attach Image", "Banner"),
            F("description", "Small Text", "Description"),
            SB("Listings", "listings_section"),
            F("listings", "Table", "Listings on Promotion", options="Campaign Listing"),
        ],
        kind="catalog",
        autoname="Prompt",
        naming_rule="Set by user",
        title_field="title",
        sort_field="modified",
    )
    out.append(camp)
    return out
