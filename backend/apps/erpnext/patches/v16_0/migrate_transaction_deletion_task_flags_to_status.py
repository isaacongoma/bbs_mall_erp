import frappe


def execute():
    """
    Migrate Transaction Deletion Record boolean task flags to status Select fields.
    Renames fields from old names to new names with _status suffix.
    Maps: 0 -> "Pending", 1 -> "Completed"
    """
    if not frappe.db.table_exists("tabTransaction Deletion Record"):
        return

    field_mapping = {
        "delete_bin_data": "delete_bin_data_status",
        "delete_leads_and_addresses": "delete_leads_and_addresses_status",
        "reset_company_default_values": "reset_company_default_values_status",
        "clear_notifications": "clear_notifications_status",
        "initialize_doctypes_table": "initialize_doctypes_table_status",
        "delete_transactions": "delete_transactions_status",
    }

    records = frappe.db.get_all("Transaction Deletion Record", pluck="name")

    for name in records or []:
        updates = {}

        for old_field, new_field in field_mapping.items():
            current_value = frappe.db.get_value("Transaction Deletion Record", name, old_field)

            if current_value in (1, "1", True):
                updates[new_field] = "Completed"
            else:
                updates[new_field] = "Pending"

        if updates:
            frappe.db.set_value("Transaction Deletion Record", name, updates, update_modified=False)
