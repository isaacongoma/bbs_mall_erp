def get_etims_custom_fields():
    def field(name, label, fieldtype="Data", **kw):
        return dict(fieldname=name, label=label, fieldtype=fieldtype, **kw)

    invoice = [
        field("etims_section", "eTIMS", "Section Break", collapsible=1),
        field("etims_submitted", "Submitted to eTIMS", "Check", read_only=1, no_copy=1, default="0"),
        field("etims_defer_submission", "Defer eTIMS Submission", "Check", no_copy=1, default="0"),
        field("etims_submission", "eTIMS Submission", "Link", options="eTIMS Submission", read_only=1, no_copy=1),
        field("etims_receipt_number", "Current Receipt Number", read_only=1, no_copy=1),
        field("etims_total_receipt_number", "Total Receipt Number", read_only=1, no_copy=1),
        field("etims_internal_data", "Internal Data", "Small Text", read_only=1, no_copy=1),
        field("etims_receipt_signature", "Receipt Signature", "Small Text", read_only=1, no_copy=1),
        field("etims_scu_id", "SCU ID", read_only=1, no_copy=1),
        field("etims_scu_datetime", "SCU Date Time", read_only=1, no_copy=1),
        field("etims_qr_url", "Receipt QR URL", "Small Text", read_only=1, no_copy=1),
    ]
    purchase = [field("etims_supplier_branch_id", "Supplier Branch ID", default="00")]
    item = [
        field("etims_item_code", "eTIMS Item Code"),
        field("etims_item_class_code", "eTIMS Item Classification Code"),
        field("etims_packaging_unit_code", "eTIMS Packaging Unit Code", default="NT"),
        field("etims_quantity_unit_code", "eTIMS Quantity Unit Code", default="U"),
    ]
    return {"Invoice": invoice, "Purchase Invoice": purchase, "Item": item}
