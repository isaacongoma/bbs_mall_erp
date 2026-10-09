CRM_CUSTOM_FIELDS = {
    "Email Template": [
        {
            "fieldname": "enabled",
            "fieldtype": "Check",
            "label": "Enabled",
            "default": "0",
            "insert_after": "subject",
        }
    ],
    "Opportunity Lost Reason": [
        {"fieldname": "description", "fieldtype": "Small Text", "label": "Description", "insert_after": "lost_reason"},
    ],
    "Assignment Rule": [
        {"fieldname": "assign_condition_json", "fieldtype": "Code", "label": "Assign Condition JSON", "insert_after": "assign_condition"},
        {"fieldname": "unassign_condition_json", "fieldtype": "Code", "label": "Unassign Condition JSON", "insert_after": "unassign_condition"},
    ],
    "Web Form": [
        {"fieldname": "crm_published", "fieldtype": "Check", "label": "Published (CRM)", "default": "0", "insert_after": "published"},
        {"fieldname": "crm_hidden_defaults", "fieldtype": "Long Text", "label": "CRM Hidden Defaults", "insert_after": "success_url"},
    ],
    "Email Account": [
        {"fieldname": "api_key", "fieldtype": "Data", "label": "API Key", "insert_after": "password"},
        {"fieldname": "api_secret", "fieldtype": "Data", "label": "API Secret", "insert_after": "api_key"},
        {
            "fieldname": "frappe_mail_site",
            "fieldtype": "Data",
            "label": "Frappe Mail Site",
            "insert_after": "api_secret",
        },
        {
            "fieldname": "create_lead_from_incoming_email",
            "fieldtype": "Check",
            "label": "Create Lead From Incoming Email",
            "default": "0",
            "insert_after": "enable_incoming",
        },
    ],
}


def install_crm_custom_fields():
    from apps.frappe.custom.doctype.custom_field.custom_field import create_custom_fields

    create_custom_fields(CRM_CUSTOM_FIELDS, ignore_validate=True)
