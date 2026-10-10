from dsl import CB, F, SB, doctype, perms, perm, FULL, EDIT, READ

UTILITY = "Electricity\nWater\nGas\nCooling\nOther"
MAINT_CATEGORIES = "Plumbing\nElectrical\nHVAC\nCleaning\nSecurity\nLifts and Escalators\nFire Safety\nStructural\nSignage\nPest Control\nIT and Network\nOther"


def defs():
    out = []

    out.append(
        doctype(
            "Utility Tariff Slab",
            [
                F("from_unit", "Float", "From Units", reqd=1, in_list_view=1),
                F("to_unit", "Float", "To Units", in_list_view=1, description="Leave empty for no upper limit"),
                F("rate", "Currency", "Rate per Unit", reqd=1, in_list_view=1),
            ],
            istable=1,
        )
    )

    out.append(
        doctype(
            "Utility Tariff",
            [
                F("tariff_name", "Data", "Tariff Name", reqd=1, unique=1, in_list_view=1),
                F("utility_type", "Select", "Utility", options=UTILITY, reqd=1, in_list_view=1, in_standard_filter=1),
                F("uom", "Data", "Unit of Measure", default="kWh", reqd=1, in_list_view=1),
                F("disabled", "Check", "Disabled"),
                CB(),
                F("item", "Link", "Billing Item", options="Item", reqd=1),
                F("rate_per_unit", "Currency", "Flat Rate per Unit", description="Used when no slabs are defined"),
                F("fixed_charge", "Currency", "Fixed Monthly Charge"),
                F("markup_percent", "Percent", "Administration Markup (%)"),
                SB("Slabs", "slabs_section"),
                F("slabs", "Table", "Tiered Rates", options="Utility Tariff Slab"),
            ],
            autoname="field:tariff_name",
            naming_rule="By fieldname",
            title_field="tariff_name",
            billing=True,
        )
    )

    out.append(
        doctype(
            "Utility Meter",
            [
                F("meter_number", "Data", "Meter Number", reqd=1, unique=1, in_list_view=1),
                F("utility_type", "Select", "Utility", options=UTILITY, reqd=1, in_list_view=1, in_standard_filter=1),
                F("status", "Select", "Status", options="Active\nInactive\nFaulty", default="Active", in_list_view=1, in_standard_filter=1),
                CB(),
                F("property", "Link", "Property", options="Property", reqd=1, in_standard_filter=1),
                F("unit", "Link", "Unit", options="Rentable Unit", reqd=1, in_list_view=1),
                F("tariff", "Link", "Tariff", options="Utility Tariff", reqd=1),
                SB("Readings", "readings_section"),
                F("initial_reading", "Float", "Initial Reading", default="0"),
                F("multiplier", "Float", "Multiplier", default="1"),
                F("installed_on", "Date", "Installed On"),
                CB(),
                F("last_reading", "Float", "Last Reading", read_only=1, no_copy=1),
                F("last_reading_date", "Date", "Last Reading Date", read_only=1, no_copy=1),
                F("current_customer", "Link", "Current Tenant", options="Customer", fetch_from="unit.current_tenant", read_only=1),
                SB("Notes", "notes_section", collapsible=1),
                F("location_notes", "Small Text", "Location"),
            ],
            autoname="field:meter_number",
            naming_rule="By fieldname",
            title_field="meter_number",
            billing=True,
        )
    )

    out.append(
        doctype(
            "Meter Reading",
            [
                F("naming_series", "Select", "Series", options="MRD-.YYYY.-.#####", default="MRD-.YYYY.-.#####", reqd=1, no_copy=1),
                F("meter", "Link", "Meter", options="Utility Meter", reqd=1, in_list_view=1, in_standard_filter=1),
                F("utility_type", "Data", "Utility", fetch_from="meter.utility_type", read_only=1, in_list_view=1),
                F("unit", "Link", "Unit", options="Rentable Unit", fetch_from="meter.unit", read_only=1, in_list_view=1),
                F("property", "Link", "Property", options="Property", fetch_from="meter.property", read_only=1),
                CB(),
                F("reading_date", "Date", "Reading Date", reqd=1, default="Today", in_list_view=1),
                F("status", "Select", "Status", options="Pending Approval\nApproved\nBilled\nRejected", default="Approved", in_list_view=1, in_standard_filter=1),
                F("source", "Select", "Source", options="Staff\nTenant Portal", default="Staff", read_only=1),
                SB("Reading", "reading_section"),
                F("previous_reading", "Float", "Previous Reading", read_only=1),
                F("current_reading", "Float", "Current Reading", reqd=1, in_list_view=1),
                F("multiplier", "Float", "Multiplier", fetch_from="meter.multiplier", read_only=1),
                CB(),
                F("consumption", "Float", "Consumption", read_only=1, in_list_view=1),
                F("tariff", "Link", "Tariff", options="Utility Tariff", fetch_from="meter.tariff", read_only=1),
                F("amount", "Currency", "Amount", read_only=1, in_list_view=1),
                SB("Billing", "billing_section"),
                F("customer", "Link", "Tenant", options="Customer", read_only=1),
                F("lease", "Link", "Lease", options="Lease Agreement", read_only=1),
                CB(),
                F("sales_invoice", "Link", "Sales Invoice", options="Sales Invoice", read_only=1, no_copy=1),
                F("photo", "Attach Image", "Meter Photo"),
                F("remarks", "Small Text", "Remarks"),
            ],
            autoname="naming_series:",
            naming_rule="By \"Naming Series\" field",
            billing=True,
        )
    )

    out.append(
        doctype(
            "Tenant Sales Declaration",
            [
                F("naming_series", "Select", "Series", options="TSD-.YYYY.-.#####", default="TSD-.YYYY.-.#####", reqd=1, no_copy=1),
                F("lease", "Link", "Lease", options="Lease Agreement", reqd=1, in_list_view=1, in_standard_filter=1),
                F("customer", "Link", "Tenant", options="Customer", fetch_from="lease.customer", read_only=1, in_list_view=1),
                F("property", "Link", "Property", options="Property", fetch_from="lease.property", read_only=1),
                CB(),
                F("status", "Select", "Status", options="Pending Approval\nApproved\nBilled\nRejected", default="Pending Approval", in_list_view=1, in_standard_filter=1),
                F("source", "Select", "Source", options="Staff\nTenant Portal", default="Staff", read_only=1),
                SB("Period", "period_section"),
                F("period_start", "Date", "Period Start", reqd=1, in_list_view=1),
                F("period_end", "Date", "Period End", reqd=1, in_list_view=1),
                CB(),
                F("gross_sales", "Currency", "Gross Sales (excl. VAT)", reqd=1, in_list_view=1),
                F("evidence", "Attach", "Supporting Document"),
                SB("Turnover Rent", "rent_section"),
                F("turnover_rent_percent", "Percent", "Turnover Rent %", read_only=1),
                F("base_rent_for_period", "Currency", "Base Rent for Period", read_only=1),
                CB(),
                F("turnover_rent_due", "Currency", "Turnover Rent Due", read_only=1, in_list_view=1),
                F("sales_invoice", "Link", "Sales Invoice", options="Sales Invoice", read_only=1, no_copy=1),
                F("remarks", "Small Text", "Remarks"),
            ],
            autoname="naming_series:",
            naming_rule="By \"Naming Series\" field",
            billing=True,
        )
    )

    out.append(
        doctype(
            "Maintenance Update",
            [
                F("posted_on", "Datetime", "Posted On", read_only=1, in_list_view=1),
                F("posted_by", "Data", "By", read_only=1, in_list_view=1),
                F("status", "Data", "Status", read_only=1, in_list_view=1),
                F("note", "Small Text", "Note", in_list_view=1),
                F("visible_to_tenant", "Check", "Visible to Tenant", default="1", in_list_view=1),
            ],
            istable=1,
        )
    )

    out.append(
        doctype(
            "Maintenance Request",
            [
                F("naming_series", "Select", "Series", options="MNT-.YYYY.-.#####", default="MNT-.YYYY.-.#####", reqd=1, no_copy=1),
                F("subject", "Data", "Subject", reqd=1, in_list_view=1),
                F("status", "Select", "Status", options="Open\nAssigned\nIn Progress\nOn Hold\nResolved\nClosed\nCancelled", default="Open", in_list_view=1, in_standard_filter=1),
                F("priority", "Select", "Priority", options="Low\nMedium\nHigh\nUrgent", default="Medium", in_list_view=1, in_standard_filter=1),
                CB(),
                F("category", "Select", "Category", options=MAINT_CATEGORIES, in_list_view=1, in_standard_filter=1),
                F("source", "Select", "Source", options="Staff\nTenant Portal\nInspection", default="Staff", read_only=1),
                F("opened_on", "Datetime", "Opened On", read_only=1, no_copy=1),
                F("due_by", "Datetime", "Respond By", read_only=1, no_copy=1),
                SB("Location", "location_section"),
                F("property", "Link", "Property", options="Property", reqd=1, in_standard_filter=1),
                F("unit", "Link", "Unit", options="Rentable Unit", in_list_view=1),
                CB(),
                F("customer", "Link", "Tenant", options="Customer", in_list_view=1),
                F("lease", "Link", "Lease", options="Lease Agreement"),
                SB("Details", "details_section"),
                F("description", "Text Editor", "Description"),
                SB("Assignment", "assignment_section"),
                F("assigned_to", "Link", "Assigned To", options="User"),
                F("contractor", "Link", "Contractor", options="Supplier"),
                F("purchase_order", "Link", "Purchase Order", options="Purchase Order"),
                CB(),
                F("estimated_cost", "Currency", "Estimated Cost"),
                F("actual_cost", "Currency", "Actual Cost"),
                F("chargeable_to_tenant", "Check", "Charge Tenant"),
                F("charge_invoice", "Link", "Recharge Invoice", options="Sales Invoice", read_only=1, no_copy=1),
                SB("Resolution", "resolution_section"),
                F("resolved_on", "Datetime", "Resolved On", read_only=1, no_copy=1),
                F("resolution", "Small Text", "Resolution"),
                CB(),
                F("rating", "Rating", "Tenant Rating", read_only=1, no_copy=1),
                F("feedback", "Small Text", "Tenant Feedback", read_only=1, no_copy=1),
                SB("Activity", "updates_section"),
                F("updates", "Table", "Updates", options="Maintenance Update"),
            ],
            autoname="naming_series:",
            naming_rule="By \"Naming Series\" field",
            title_field="subject",
            search_fields="subject,unit,customer,category",
            billing=False,
        )
    )

    out.append(
        doctype(
            "Tenant Notice Recipient",
            [F("customer", "Link", "Tenant", options="Customer", reqd=1, in_list_view=1), F("customer_name", "Data", "Name", fetch_from="customer.customer_name", read_only=1, in_list_view=1)],
            istable=1,
        )
    )

    out.append(
        doctype(
            "Tenant Notice",
            [
                F("naming_series", "Select", "Series", options="NTC-.YYYY.-.####", default="NTC-.YYYY.-.####", reqd=1, no_copy=1),
                F("title", "Data", "Title", reqd=1, in_list_view=1),
                F("status", "Select", "Status", options="Draft\nPublished\nExpired", default="Draft", read_only=1, in_list_view=1, in_standard_filter=1),
                F("priority", "Select", "Priority", options="Info\nImportant\nUrgent", default="Info", in_list_view=1, in_standard_filter=1),
                CB(),
                F("audience", "Select", "Audience", options="All Tenants\nProperty\nSpecific Tenants", default="All Tenants", reqd=1),
                F("property", "Link", "Property", options="Property", depends_on="eval:doc.audience=='Property'", mandatory_depends_on="eval:doc.audience=='Property'"),
                F("publish_on", "Datetime", "Publish On", in_list_view=1),
                F("expires_on", "Datetime", "Expires On"),
                SB("Message", "message_section"),
                F("message", "Text Editor", "Message", reqd=1),
                F("attachment", "Attach", "Attachment"),
                SB("Delivery", "delivery_section"),
                F("send_sms", "Check", "Also Send by SMS"),
                F("send_email", "Check", "Also Send by Email"),
                CB(),
                F("published_on", "Datetime", "Published At", read_only=1, no_copy=1),
                F("recipient_count", "Int", "Tenants Reached", read_only=1, no_copy=1),
                SB("Recipients", "recipients_section", depends_on="eval:doc.audience=='Specific Tenants'"),
                F("recipients", "Table", "Tenants", options="Tenant Notice Recipient"),
            ],
            autoname="naming_series:",
            naming_rule="By \"Naming Series\" field",
            title_field="title",
            billing=False,
        )
    )

    out.append(
        doctype(
            "Space Enquiry",
            [
                F("naming_series", "Select", "Series", options="ENQ-.YYYY.-.####", default="ENQ-.YYYY.-.####", reqd=1, no_copy=1),
                F("prospect_name", "Data", "Prospect / Business Name", reqd=1, in_list_view=1),
                F("status", "Select", "Status", options="New\nContacted\nSite Visit\nProposal Sent\nNegotiation\nWon\nLost", default="New", in_list_view=1, in_standard_filter=1),
                F("business_type", "Data", "Type of Business", in_list_view=1),
                CB(),
                F("contact_person", "Data", "Contact Person"),
                F("contact_phone", "Data", "Phone", options="Phone", in_list_view=1),
                F("contact_email", "Data", "Email", options="Email"),
                F("source", "Select", "Source", options="\nWalk-in\nReferral\nWebsite\nBroker\nSocial Media\nOther"),
                SB("Requirement", "requirement_section"),
                F("property", "Link", "Property", options="Property", in_standard_filter=1),
                F("unit", "Link", "Preferred Unit", options="Rentable Unit"),
                F("required_area_sqm", "Float", "Required Area (sqm)"),
                CB(),
                F("budget_per_month", "Currency", "Monthly Budget"),
                F("expected_start", "Date", "Expected Start"),
                F("assigned_to", "Link", "Assigned To", options="User"),
                SB("Outcome", "outcome_section"),
                F("lease", "Link", "Lease", options="Lease Agreement", read_only=1, no_copy=1),
                F("customer", "Link", "Customer", options="Customer", read_only=1, no_copy=1),
                CB(),
                F("lost_reason", "Small Text", "Reason Lost", depends_on="eval:doc.status=='Lost'"),
                F("notes", "Text Editor", "Notes"),
            ],
            autoname="naming_series:",
            naming_rule="By \"Naming Series\" field",
            title_field="prospect_name",
            billing=False,
        )
    )

    out.append(
        doctype(
            "Mpesa Payment",
            [
                F("transaction_id", "Data", "M-Pesa Receipt", unique=1, in_list_view=1, search_index=1),
                F("source", "Select", "Source", options="STK Push\nC2B Paybill\nC2B Till", in_list_view=1, in_standard_filter=1),
                F("status", "Select", "Status", options="Pending\nReceived\nAllocated\nUnmatched\nFailed\nCancelled", default="Pending", in_list_view=1, in_standard_filter=1),
                F("amount", "Currency", "Amount", in_list_view=1),
                CB(),
                F("phone", "Data", "Phone", in_list_view=1),
                F("payer_name", "Data", "Payer Name"),
                F("account_reference", "Data", "Account Reference"),
                F("transaction_time", "Datetime", "Transaction Time"),
                SB("Allocation", "allocation_section"),
                F("customer", "Link", "Tenant", options="Customer", in_list_view=1, in_standard_filter=1),
                F("lease", "Link", "Lease", options="Lease Agreement"),
                F("sales_invoice", "Link", "Invoice", options="Sales Invoice"),
                CB(),
                F("payment_entry", "Link", "Payment Entry", options="Payment Entry", read_only=1, no_copy=1),
                F("result_description", "Small Text", "Result"),
                SB("Gateway", "gateway_section", collapsible=1),
                F("checkout_request_id", "Data", "Checkout Request ID", search_index=1),
                F("merchant_request_id", "Data", "Merchant Request ID"),
                F("raw_payload", "Code", "Payload", options="JSON", read_only=1),
            ],
            autoname="hash",
            naming_rule="Random",
            title_field="transaction_id",
            billing=True,
        )
    )

    out.append(
        doctype(
            "Tenant Portal User",
            [
                F("user", "Link", "User", options="User", reqd=1, in_list_view=1),
                F("full_name", "Data", "Name", fetch_from="user.full_name", read_only=1, in_list_view=1),
                F("access_level", "Select", "Access", options="Owner\nFinance\nOperations", default="Owner", reqd=1, in_list_view=1),
            ],
            istable=1,
        )
    )

    return out
