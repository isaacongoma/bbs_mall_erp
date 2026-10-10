from dsl import CB, F, SB, TB, doctype

FREQ = "Monthly\nQuarterly\nHalf-Yearly\nAnnually"
DOC_TYPES = "Signed Lease\nID / Passport\nKRA PIN Certificate\nBusiness Permit\nCompany Registration\nInsurance Cover\nOther"


def defs():
    out = []

    out.append(
        doctype(
            "Lease Unit",
            [
                F("unit", "Link", "Unit", options="Rentable Unit", reqd=1, in_list_view=1),
                F("unit_type", "Data", "Type", fetch_from="unit.unit_type", read_only=1, in_list_view=1),
                F("area_sqm", "Float", "Area (sqm)", fetch_from="unit.area_sqm", read_only=1, in_list_view=1, precision="2"),
                F("monthly_rent", "Currency", "Monthly Rent", reqd=1, in_list_view=1),
                F("monthly_service_charge", "Currency", "Monthly Service Charge", in_list_view=1),
            ],
            istable=1,
        )
    )

    out.append(
        doctype(
            "Lease Charge",
            [
                F("charge_item", "Link", "Charge Item", options="Item", reqd=1, in_list_view=1),
                F("description", "Data", "Description", in_list_view=1),
                F("amount", "Currency", "Amount", reqd=1, in_list_view=1),
                F("frequency", "Select", "Frequency", options="Monthly\nQuarterly\nHalf-Yearly\nAnnually\nOne-off", default="Monthly", in_list_view=1),
                F("escalates", "Check", "Escalates with Rent"),
                F("one_off_billed", "Check", "Billed", read_only=1, no_copy=1),
            ],
            istable=1,
        )
    )

    out.append(
        doctype(
            "Lease Rent Schedule",
            [
                F("from_date", "Date", "From", reqd=1, in_list_view=1),
                F("to_date", "Date", "To", reqd=1, in_list_view=1),
                F("monthly_rent", "Currency", "Monthly Rent", in_list_view=1),
                F("monthly_service_charge", "Currency", "Monthly Service Charge", in_list_view=1),
                F("note", "Data", "Note", in_list_view=1),
            ],
            istable=1,
        )
    )

    out.append(
        doctype(
            "Lease Document",
            [
                F("document_type", "Select", "Document Type", options=DOC_TYPES, reqd=1, in_list_view=1),
                F("file", "Attach", "File", reqd=1, in_list_view=1),
                F("expiry_date", "Date", "Expiry Date", in_list_view=1),
                F("notes", "Data", "Notes"),
            ],
            istable=1,
        )
    )

    out.append(
        doctype(
            "Lease Agreement",
            [
                F("naming_series", "Select", "Series", options="LSE-.YYYY.-.#####", default="LSE-.YYYY.-.#####", reqd=1, set_only_once=1, no_copy=1),
                F("customer", "Link", "Tenant", options="Customer", reqd=1, in_list_view=1, in_standard_filter=1, search_index=1),
                F("tenant_name", "Data", "Tenant Name", fetch_from="customer.customer_name", read_only=1, in_list_view=1),
                F("trading_name", "Data", "Trading As"),
                F("lease_type", "Select", "Lease Type", options="New\nRenewal\nExtension", default="New"),
                F("renewal_of", "Link", "Renewal Of", options="Lease Agreement", read_only=1, no_copy=1),
                CB(),
                F("status", "Select", "Status", options="Draft\nActive\nExpiring Soon\nExpired\nTerminated\nRenewed\nCancelled", default="Draft", read_only=1, allow_on_submit=1, no_copy=1, in_list_view=1, in_standard_filter=1),
                F("property", "Link", "Property", options="Property", reqd=1, in_list_view=1, in_standard_filter=1, search_index=1),
                F("company", "Link", "Company", options="Company", fetch_from="property.company", read_only=1),
                F("cost_center", "Link", "Cost Center", options="Cost Center", fetch_from="property.cost_center"),
                F("amended_from", "Link", "Amended From", options="Lease Agreement", read_only=1, no_copy=1, print_hide=1),
                TB("Lease", "lease_tab"),
                SB("Term", "term_section"),
                F("start_date", "Date", "Lease Start", reqd=1, in_list_view=1),
                F("end_date", "Date", "Lease End", reqd=1, in_list_view=1, in_standard_filter=1),
                F("lease_term_months", "Int", "Term (months)", read_only=1),
                CB(),
                F("rent_free_months", "Int", "Rent-free Months", default="0"),
                F("rent_start_date", "Date", "Rent Starts", read_only=1),
                F("notice_period_days", "Int", "Notice Period (days)", default="90"),
                F("auto_renew", "Check", "Renew Automatically"),
                SB("Units", "units_section"),
                F("units", "Table", "Leased Units", options="Lease Unit", reqd=1),
                F("total_area", "Float", "Total Area (sqm)", read_only=1, precision="2"),
                CB(),
                F("total_monthly_rent", "Currency", "Total Monthly Rent", read_only=1),
                F("total_monthly_service_charge", "Currency", "Total Monthly Service Charge", read_only=1),
                SB("Billing", "billing_section"),
                F("billing_frequency", "Select", "Billing Frequency", options=FREQ, default="Monthly", reqd=1),
                F("billing_day", "Int", "Invoice Day of Period", default="1", description="1 = invoice on the first day of each billing period"),
                F("payment_terms_days", "Int", "Payment Due After (days)", default="7"),
                CB(),
                F("auto_invoice", "Check", "Invoice Automatically", default="1"),
                F("tax_template", "Link", "Sales Tax Template", options="Sales Taxes and Charges Template"),
                F("next_billing_date", "Date", "Next Billing Period Starts", read_only=1, no_copy=1, allow_on_submit=1),
                F("last_billed_to", "Date", "Billed Up To", read_only=1, no_copy=1, allow_on_submit=1),
                SB("Escalation", "escalation_section"),
                F("escalation_type", "Select", "Escalation Type", options="None\nPercentage\nFixed Amount", default="Percentage"),
                F("escalation_rate", "Percent", "Escalation Rate", depends_on="eval:doc.escalation_type=='Percentage'"),
                CB(),
                F("escalation_amount", "Currency", "Escalation Amount", depends_on="eval:doc.escalation_type=='Fixed Amount'"),
                F("escalation_months", "Int", "Escalate Every (months)", default="12", depends_on="eval:doc.escalation_type!='None'"),
                SB("Additional Charges", "charges_section"),
                F("charges", "Table", "Charges", options="Lease Charge"),
                SB("Turnover Rent", "turnover_section", collapsible=1),
                F("turnover_rent_applicable", "Check", "Turnover Rent Applies"),
                F("turnover_rent_percent", "Percent", "Turnover Rent (% of sales)", depends_on="turnover_rent_applicable"),
                SB("Rent Schedule", "schedule_section", collapsible=1),
                F("rent_schedule", "Table", "Rent Schedule", options="Lease Rent Schedule", read_only=1, no_copy=1),
                TB("Deposit and Summary", "finance_tab"),
                SB("Security Deposit", "deposit_section"),
                F("security_deposit_amount", "Currency", "Security Deposit Required"),
                F("deposit_received", "Currency", "Deposit Received", read_only=1, no_copy=1),
                CB(),
                F("deposit_balance", "Currency", "Deposit Held", read_only=1, no_copy=1),
                SB("Account Summary", "summary_section"),
                F("total_billed", "Currency", "Total Billed", read_only=1, no_copy=1),
                F("total_paid", "Currency", "Total Paid", read_only=1, no_copy=1),
                CB(),
                F("outstanding_amount", "Currency", "Outstanding", read_only=1, no_copy=1),
                F("overdue_amount", "Currency", "Overdue", read_only=1, no_copy=1),
                TB("Terms and Signing", "terms_tab"),
                SB("Terms", "terms_section"),
                F("terms_template", "Link", "Terms Template", options="Terms and Conditions"),
                F("terms", "Text Editor", "Lease Terms"),
                SB("Signatures", "signatures_section"),
                F("landlord_signatory", "Link", "Landlord Signatory", options="User"),
                F("landlord_signature", "Signature", "Landlord Signature", allow_on_submit=1),
                F("landlord_signed_on", "Datetime", "Signed On", read_only=1, allow_on_submit=1, no_copy=1),
                CB(),
                F("tenant_signatory_name", "Data", "Tenant Signatory"),
                F("tenant_signature", "Signature", "Tenant Signature", allow_on_submit=1),
                F("tenant_signed_on", "Datetime", "Signed On", read_only=1, allow_on_submit=1, no_copy=1),
                F("signed_copy", "Attach", "Signed Copy", allow_on_submit=1),
                SB("Documents", "documents_section"),
                F("documents", "Table", "Documents", options="Lease Document", allow_on_submit=1),
                TB("Termination", "termination_tab"),
                F("termination_date", "Date", "Termination Date", read_only=1, allow_on_submit=1, no_copy=1),
                F("termination_type", "Select", "Termination Type", options="\nExpiry\nMutual Agreement\nTenant Breach\nLandlord Notice\nRelocation", read_only=1, allow_on_submit=1, no_copy=1),
                CB(),
                F("termination_reason", "Small Text", "Reason", read_only=1, allow_on_submit=1, no_copy=1),
            ],
            is_submittable=1,
            autoname="naming_series:",
            naming_rule="By \"Naming Series\" field",
            title_field="tenant_name",
            search_fields="customer,tenant_name,property,status",
            billing=False,
            links=[],
        )
    )

    out.append(
        doctype(
            "Lease Billing Run Item",
            [
                F("lease", "Link", "Lease", options="Lease Agreement", in_list_view=1),
                F("customer", "Link", "Tenant", options="Customer", in_list_view=1),
                F("period_start", "Date", "Period Start", in_list_view=1),
                F("period_end", "Date", "Period End", in_list_view=1),
                F("amount", "Currency", "Amount", in_list_view=1),
                F("sales_invoice", "Link", "Sales Invoice", options="Sales Invoice", in_list_view=1),
                F("status", "Select", "Status", options="Pending\nInvoiced\nSkipped\nError", default="Pending", in_list_view=1),
                F("message", "Small Text", "Message"),
            ],
            istable=1,
        )
    )

    out.append(
        doctype(
            "Lease Billing Run",
            [
                F("naming_series", "Select", "Series", options="LBR-.YYYY.-.#####", default="LBR-.YYYY.-.#####", reqd=1, no_copy=1),
                F("company", "Link", "Company", options="Company", reqd=1, in_standard_filter=1),
                F("property", "Link", "Property", options="Property", in_list_view=1, in_standard_filter=1),
                F("run_date", "Date", "Billing Date", reqd=1, default="Today", in_list_view=1),
                CB(),
                F("include_utilities", "Check", "Include Approved Meter Readings", default="1"),
                F("include_turnover", "Check", "Include Turnover Rent", default="1"),
                F("submit_invoices", "Check", "Submit Invoices", default="1"),
                F("status", "Select", "Status", options="Draft\nCompleted\nCompleted with Errors\nCancelled", default="Draft", read_only=1, no_copy=1, in_list_view=1, in_standard_filter=1),
                F("amended_from", "Link", "Amended From", options="Lease Billing Run", read_only=1, no_copy=1, print_hide=1),
                SB("Result", "result_section"),
                F("leases_found", "Int", "Leases Found", read_only=1, no_copy=1),
                F("invoices_created", "Int", "Invoices Created", read_only=1, no_copy=1),
                CB(),
                F("errors", "Int", "Errors", read_only=1, no_copy=1),
                F("total_amount", "Currency", "Total Invoiced", read_only=1, no_copy=1, in_list_view=1),
                SB("Invoices", "items_section"),
                F("items", "Table", "Items", options="Lease Billing Run Item", read_only=1, no_copy=1),
            ],
            is_submittable=1,
            autoname="naming_series:",
            naming_rule="By \"Naming Series\" field",
            billing=True,
        )
    )

    out.append(
        doctype(
            "Lease Deposit",
            [
                F("naming_series", "Select", "Series", options="LDP-.YYYY.-.#####", default="LDP-.YYYY.-.#####", reqd=1, no_copy=1),
                F("lease", "Link", "Lease", options="Lease Agreement", reqd=1, in_list_view=1, in_standard_filter=1),
                F("customer", "Link", "Tenant", options="Customer", fetch_from="lease.customer", read_only=1, in_list_view=1),
                F("company", "Link", "Company", options="Company", fetch_from="lease.company", read_only=1),
                CB(),
                F("transaction_type", "Select", "Transaction", options="Receipt\nRefund\nDeduction", default="Receipt", reqd=1, in_list_view=1, in_standard_filter=1),
                F("posting_date", "Date", "Date", reqd=1, default="Today", in_list_view=1),
                F("amount", "Currency", "Amount", reqd=1, in_list_view=1),
                SB("Payment", "payment_section"),
                F("mode_of_payment", "Link", "Mode of Payment", options="Mode of Payment", depends_on="eval:doc.transaction_type!='Deduction'"),
                F("bank_account", "Link", "Cash / Bank Account", options="Account", depends_on="eval:doc.transaction_type!='Deduction'"),
                F("reference_no", "Data", "Reference No"),
                CB(),
                F("reference_date", "Date", "Reference Date"),
                F("against_invoice", "Link", "Apply Against Invoice", options="Sales Invoice", depends_on="eval:doc.transaction_type=='Deduction'"),
                F("remarks", "Small Text", "Remarks"),
                SB("Posting", "posting_section"),
                F("journal_entry", "Link", "Journal Entry", options="Journal Entry", read_only=1, no_copy=1),
                F("amended_from", "Link", "Amended From", options="Lease Deposit", read_only=1, no_copy=1, print_hide=1),
            ],
            is_submittable=1,
            autoname="naming_series:",
            naming_rule="By \"Naming Series\" field",
            billing=True,
        )
    )

    return out
