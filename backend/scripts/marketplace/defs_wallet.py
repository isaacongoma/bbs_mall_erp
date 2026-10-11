from mdsl import CB, F, SB, TB, doctype
from defs_orders import with_series

TXN_TYPES = "Sale\nRefund Reversal\nWithdrawal\nWithdrawal Fee\nBill Payment\nAdjustment\nReversal"


def defs():
    out = []

    txn = doctype(
        "Seller Wallet Transaction",
        [
            F("seller", "Link", "Seller", options="Marketplace Seller", reqd=1, in_list_view=1, in_standard_filter=1),
            F("posting_date", "Datetime", "Date", reqd=1, in_list_view=1),
            F("transaction_type", "Select", "Type", options=TXN_TYPES, reqd=1, in_list_view=1, in_standard_filter=1),
            F("amount", "Currency", "Amount", reqd=1, in_list_view=1, description="Positive credits the wallet, negative debits it"),
            CB(),
            F("status", "Select", "Status", options="Held\nAvailable\nPosted", default="Posted", in_list_view=1, in_standard_filter=1),
            F("available_on", "Date", "Releases On"),
            F("balance_after", "Currency", "Balance After", read_only=1, in_list_view=1),
            SB("Reference", "reference_section"),
            F("reference_doctype", "Link", "Reference Type", options="DocType"),
            F("reference_name", "Dynamic Link", "Reference", options="reference_doctype", in_list_view=1),
            F("journal_entry", "Link", "Journal Entry", options="Journal Entry", read_only=1),
            CB(),
            F("released_on", "Datetime", "Released On", read_only=1),
            F("remarks", "Small Text", "Remarks"),
        ],
        kind="readonly",
        sort_field="posting_date",
    )
    out.append(with_series(txn, "WLT-.YYYY.-"))

    wd = doctype(
        "Seller Withdrawal",
        [
            F("seller", "Link", "Seller", options="Marketplace Seller", reqd=1, in_list_view=1, in_standard_filter=1, set_only_once=1),
            F("amount", "Currency", "Amount", reqd=1, in_list_view=1, set_only_once=1),
            F("fee", "Currency", "Fee", read_only=1),
            F("net_amount", "Currency", "Seller Receives", read_only=1, in_list_view=1),
            CB(),
            F("status", "Select", "Status", options="Requested\nPending Approval\nApproved\nProcessing\nPaid\nFailed\nRejected\nCancelled", default="Requested", in_list_view=1, in_standard_filter=1),
            F("method", "Select", "Method", options="M-Pesa\nBank Transfer", reqd=1, in_list_view=1),
            F("requested_on", "Datetime", "Requested", read_only=1),
            F("processed_on", "Datetime", "Processed", read_only=1),
            SB("Destination", "destination_section"),
            F("payout_account", "Data", "Payout Account Row", read_only=1),
            F("mpesa_number", "Data", "M-Pesa Number", depends_on="eval:doc.method=='M-Pesa'"),
            F("bank_account", "Link", "Bank Account", options="Bank Account", depends_on="eval:doc.method=='Bank Transfer'"),
            CB(),
            F("account_holder", "Data", "Account Holder"),
            F("balance_before", "Currency", "Available Before", read_only=1),
            SB("Processing", "processing_section"),
            F("approved_by", "Link", "Approved By", options="User", read_only=1),
            F("conversation_id", "Data", "Daraja Conversation ID", read_only=1, search_index=1),
            F("originator_conversation_id", "Data", "Originator Conversation ID", read_only=1, search_index=1),
            CB(),
            F("receipt_no", "Data", "Receipt / Bank Reference", in_list_view=1),
            F("failure_reason", "Small Text", "Failure Reason", read_only=1),
            SB("Accounting", "accounting_section", collapsible=1),
            F("hold_journal", "Link", "Hold Journal", options="Journal Entry", read_only=1, no_copy=1),
            F("payout_journal", "Link", "Payout Journal", options="Journal Entry", read_only=1, no_copy=1),
            CB(),
            F("wallet_transaction", "Link", "Wallet Entry", options="Seller Wallet Transaction", read_only=1, no_copy=1),
            F("remarks", "Small Text", "Remarks"),
        ],
        kind="finance",
        sort_field="modified",
    )
    out.append(with_series(wd, "WDR-.YYYY.-"))

    out.append(doctype(
        "Wallet Bill Invoice",
        [
            F("sales_invoice", "Link", "Invoice", options="Sales Invoice", reqd=1, in_list_view=1),
            F("posting_date", "Date", "Date", fetch_from="sales_invoice.posting_date", read_only=1, in_list_view=1),
            F("bill_type", "Data", "Bill", read_only=1, in_list_view=1),
            F("outstanding_amount", "Currency", "Outstanding", read_only=1, in_list_view=1),
            F("allocated_amount", "Currency", "Pay", reqd=1, in_list_view=1),
        ],
        istable=1,
    ))
    bill = doctype(
        "Wallet Bill Payment",
        [
            F("seller", "Link", "Seller", options="Marketplace Seller", reqd=1, in_list_view=1, in_standard_filter=1),
            F("customer", "Link", "Tenant Account", options="Customer", fetch_from="seller.customer", read_only=1, in_list_view=1),
            F("posting_date", "Date", "Date", reqd=1, default="Today", in_list_view=1),
            F("company", "Link", "Company", options="Company", reqd=1),
            CB(),
            F("total_amount", "Currency", "Total", read_only=1, in_list_view=1),
            F("available_before", "Currency", "Wallet Available", read_only=1),
            F("journal_entry", "Link", "Journal Entry", options="Journal Entry", read_only=1, no_copy=1),
            F("remarks", "Small Text", "Remarks"),
            SB("Invoices", "invoices_section"),
            F("invoices", "Table", "Invoices to Pay", options="Wallet Bill Invoice", reqd=1),
            F("amended_from", "Link", "Amended From", options="Wallet Bill Payment", read_only=1, no_copy=1),
        ],
        kind="finance",
        is_submittable=1,
        sort_field="modified",
    )
    out.append(with_series(bill, "WBP-.YYYY.-"))

    rule = (doctype(
        "Commission Rule",
        [
            F("title", "Data", "Title", reqd=1, in_list_view=1),
            F("enabled", "Check", "Enabled", default="1", in_list_view=1),
            F("applies_to", "Select", "Applies To", options="Everything\nCategory\nSeller\nBrand\nCategory and Seller", default="Category", reqd=1, in_list_view=1),
            F("priority", "Int", "Priority", default="10", in_list_view=1, description="Highest priority that matches wins"),
            CB(),
            F("buyer_type", "Select", "Buyer Type", options="Both\nB2C\nB2B", default="Both", in_list_view=1),
            F("item_group", "Link", "Category", options="Item Group", depends_on="eval:['Category','Category and Seller'].includes(doc.applies_to)"),
            F("seller", "Link", "Seller", options="Marketplace Seller", depends_on="eval:['Seller','Category and Seller'].includes(doc.applies_to)"),
            F("brand", "Link", "Brand", options="Brand", depends_on="eval:doc.applies_to=='Brand'"),
            SB("Rate", "rate_section"),
            F("rate_percent", "Percent", "Commission %", reqd=1, in_list_view=1),
            F("fixed_fee", "Currency", "Fixed Fee per Item"),
            CB(),
            F("min_fee", "Currency", "Minimum Fee"),
            F("max_fee", "Currency", "Maximum Fee"),
            SB("Validity", "validity_section"),
            F("valid_from", "Date", "Valid From"),
            F("valid_upto", "Date", "Valid Until"),
        ],
        kind="finance",
        title_field="title",
        sort_field="modified",
    ))
    out.append(with_series(rule, "COM-RULE-.####"))
    return out
