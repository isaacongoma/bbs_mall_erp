# Ported from each doctype controller's default_list_data()/default_kanban_settings()
# static methods (frappe/crm, AGPL-3.0) -- crm_lead.py, crm_deal.py,
# crm_organization.py, crm_task.py, fcrm_note.py, crm_call_log.py, plus
# crm/overrides/contact.py's CustomContact (frappe/crm overrides Contact's
# doctype class via hooks.py's override_doctype_class specifically to add
# this -- Contact itself, a core frappe/frappe doctype, has no
# default_list_data method of its own). Mirrors
# get_controller(doctype).default_list_data() in crm/api/doc.py's get_data().
LIST_DEFAULTS = {
    "Contact": {
        "columns": [
            {"label": "Name", "type": "Data", "key": "full_name", "width": "17rem"},
            {"label": "Email", "type": "Data", "key": "email_id", "width": "12rem"},
            {"label": "Phone", "type": "Data", "key": "mobile_no", "width": "12rem"},
            {"label": "Organization", "type": "Data", "key": "company_name", "width": "12rem"},
            {"label": "Last Modified", "type": "Datetime", "key": "modified", "width": "8rem"},
        ],
        "rows": ["name", "full_name", "company_name", "email_id", "mobile_no", "modified", "image"],
        "kanban": None,
    },
    "CRM Lead": {
        "columns": [
            {"label": "Full Name", "type": "Data", "key": "lead_name", "width": "12rem"},
            {"label": "Organization", "type": "Link", "key": "organization", "options": "CRM Organization", "width": "10rem"},
            {"label": "Status", "type": "Link", "options": "CRM Lead Status", "key": "status", "width": "8rem"},
            {"label": "Email", "type": "Data", "key": "email", "width": "12rem"},
            {"label": "Mobile No.", "type": "Data", "key": "mobile_no", "width": "11rem"},
            {"label": "Assigned To", "type": "Text", "key": "_assign", "width": "10rem"},
            {"label": "Last Modified", "type": "Datetime", "key": "modified", "width": "8rem"},
        ],
        "rows": [
            "name", "lead_name", "organization", "status", "email", "mobile_no", "lead_owner",
            "first_name", "sla_status", "response_by", "first_response_time", "first_responded_on",
            "modified", "_assign", "image",
        ],
        "kanban": {
            "column_field": "status", "title_field": "lead_name",
            "kanban_fields": ["organization", "email", "mobile_no", "_assign", "modified"],
        },
    },
    "CRM Deal": {
        "columns": [
            {"label": "Organization", "type": "Link", "key": "organization", "options": "CRM Organization", "width": "11rem"},
            {"label": "Annual Revenue", "type": "Currency", "key": "annual_revenue", "align": "right", "width": "9rem"},
            {"label": "Status", "type": "Link", "options": "CRM Deal Status", "key": "status", "width": "10rem"},
            {"label": "Email", "type": "Data", "key": "email", "width": "12rem"},
            {"label": "Mobile No.", "type": "Data", "key": "mobile_no", "width": "11rem"},
            {"label": "Assigned To", "type": "Text", "key": "_assign", "width": "10rem"},
            {"label": "Last Modified", "type": "Datetime", "key": "modified", "width": "8rem"},
        ],
        "rows": [
            "name", "organization", "annual_revenue", "status", "email", "currency", "mobile_no",
            "deal_owner", "sla_status", "response_by", "first_response_time", "first_responded_on",
            "modified", "_assign",
        ],
        "kanban": {
            "column_field": "status", "title_field": "organization",
            "kanban_fields": ["annual_revenue", "email", "mobile_no", "_assign", "modified"],
        },
    },
    "CRM Organization": {
        "columns": [
            {"label": "Organization", "type": "Data", "key": "organization_name", "width": "16rem"},
            {"label": "Website", "type": "Data", "key": "website", "width": "14rem"},
            {"label": "Industry", "type": "Link", "key": "industry", "options": "CRM Industry", "width": "14rem"},
            {"label": "Annual Revenue", "type": "Currency", "key": "annual_revenue", "width": "14rem"},
            {"label": "Last Modified", "type": "Datetime", "key": "modified", "width": "8rem"},
        ],
        "rows": ["name", "organization_name", "organization_logo", "website", "industry", "currency", "annual_revenue", "modified"],
        "kanban": None,
    },
    "CRM Task": {
        "columns": [
            {"label": "Title", "type": "Data", "key": "title", "width": "16rem"},
            {"label": "Status", "type": "Select", "key": "status", "width": "8rem"},
            {"label": "Priority", "type": "Select", "key": "priority", "width": "8rem"},
            {"label": "Due Date", "type": "Date", "key": "due_date", "width": "8rem"},
            {"label": "Assigned To", "type": "Link", "key": "assigned_to", "options": "User", "width": "10rem"},
            {"label": "Last Modified", "type": "Datetime", "key": "modified", "width": "8rem"},
        ],
        "rows": ["name", "title", "description", "assigned_to", "due_date", "status", "priority", "reference_doctype", "reference_docname", "modified"],
        "kanban": {
            "column_field": "status", "title_field": "title",
            "kanban_fields": ["description", "priority", "creation"],
        },
    },
    "FCRM Note": {
        "columns": [],
        "rows": ["name", "title", "content", "reference_doctype", "reference_docname", "owner", "modified"],
        "kanban": None,
    },
    "CRM Call Log": {
        "columns": [
            {"label": "Caller", "type": "Link", "key": "caller", "options": "User", "width": "9rem"},
            {"label": "Receiver", "type": "Link", "key": "receiver", "options": "User", "width": "9rem"},
            {"label": "Type", "type": "Select", "key": "type", "width": "9rem"},
            {"label": "Status", "type": "Select", "key": "status", "width": "9rem"},
            {"label": "Duration", "type": "Duration", "key": "duration", "width": "6rem"},
            {"label": "From (number)", "type": "Data", "key": "from_number", "width": "9rem"},
            {"label": "To (number)", "type": "Data", "key": "to_number", "width": "9rem"},
            {"label": "Created On", "type": "Datetime", "key": "creation", "width": "8rem"},
        ],
        "rows": ["name", "caller", "receiver", "type", "status", "duration", "from_number", "to_number", "note", "recording_url", "reference_doctype", "reference_docname", "creation"],
        "kanban": None,
    },
}


def default_list_data(doctype_label: str) -> dict:
    entry = LIST_DEFAULTS.get(doctype_label, {})
    return {"columns": entry.get("columns", []), "rows": entry.get("rows", ["name", "modified"])}


def default_kanban_settings(doctype_label: str) -> dict | None:
    return LIST_DEFAULTS.get(doctype_label, {}).get("kanban")
