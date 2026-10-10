import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from dsl import MODULE, MODULE_DIR, ROOT, STAMP, scrub  # noqa: E402

BASE = ROOT / MODULE_DIR
FRONTEND = Path(__file__).resolve().parents[3] / "frontend" / "src" / "modules" / "bbs_property" / MODULE_DIR
ROLES = ["Property Manager", "Leasing Officer", "Property Accountant", "System Manager", "Accounts Manager"]


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    text = content if isinstance(content, str) else json.dumps(content, indent=1, ensure_ascii=False) + "\n"
    path.write_text(text, encoding="utf-8")


def f_link(name, label, options, reqd=0, default=None, depends=None):
    return {"fieldname": name, "label": label, "fieldtype": "Link", "options": options, "reqd": reqd, "default": default}


def f_date(name, label, default=None, reqd=0):
    return {"fieldname": name, "label": label, "fieldtype": "Date", "default": default, "reqd": reqd}


def f_select(name, label, options, default=None):
    return {"fieldname": name, "label": label, "fieldtype": "Select", "options": options, "default": default}


def f_check(name, label):
    return {"fieldname": name, "label": label, "fieldtype": "Check"}


COMPANY = f_link("company", "Company", "Company", default="frappe.defaults.get_user_default('Company')")
PROPERTY = f_link("property", "Property", "Property")
CUSTOMER = f_link("customer", "Tenant", "Customer")

REPORTS = {
    "Rent Roll": ("Lease Agreement", [COMPANY, PROPERTY, f_date("as_on", "As On", "frappe.datetime.get_today()"), f_select("status", "Status", "\nVacant\nReserved\nOccupied\nUnder Maintenance")], 0),
    "Occupancy and Vacancy": ("Rentable Unit", [COMPANY, PROPERTY, f_select("group_by", "Group By", "Property\nFloor\nUnit Type", "Floor")], 0),
    "Lease Expiry": ("Lease Agreement", [COMPANY, PROPERTY, {"fieldname": "within_days", "label": "Expiring Within (days)", "fieldtype": "Int", "default": 180}], 0),
    "Tenant Arrears Aging": ("Sales Invoice", [COMPANY, PROPERTY, CUSTOMER, f_date("as_on", "As On", "frappe.datetime.get_today()")], 1),
    "Collection Efficiency": ("Sales Invoice", [COMPANY, PROPERTY, f_date("from_date", "From", "frappe.datetime.add_months(frappe.datetime.month_start(), -11)"), f_date("to_date", "To", "frappe.datetime.month_end()")], 1),
    "Revenue per Sqm": ("Sales Invoice", [COMPANY, PROPERTY, f_date("from_date", "From", "frappe.datetime.add_months(frappe.datetime.month_start(), -11)"), f_date("to_date", "To", "frappe.datetime.month_end()")], 1),
    "Tenant Statement": ("Customer", [f_link("customer", "Tenant", "Customer", reqd=1), f_date("from_date", "From", "frappe.datetime.add_months(frappe.datetime.get_today(), -6)"), f_date("to_date", "To", "frappe.datetime.get_today()")], 1),
    "Deposit Ledger": ("Lease Deposit", [COMPANY, PROPERTY, CUSTOMER, f_check("only_with_balance", "Only Leases Holding a Deposit")], 1),
    "Utility Consumption": ("Meter Reading", [PROPERTY, f_select("utility_type", "Utility", "\nElectricity\nWater\nGas\nCooling\nOther"), f_date("from_date", "From", "frappe.datetime.add_months(frappe.datetime.month_start(), -5)"), f_date("to_date", "To", "frappe.datetime.month_end()")], 0),
    "Maintenance Summary": ("Maintenance Request", [PROPERTY, f_select("category", "Category", "\nPlumbing\nElectrical\nHVAC\nCleaning\nSecurity\nLifts and Escalators\nFire Safety\nStructural\nSignage\nPest Control\nIT and Network\nOther"), f_date("from_date", "From", "frappe.datetime.add_months(frappe.datetime.get_today(), -3)"), f_date("to_date", "To", "frappe.datetime.get_today()")], 0),
    "Turnover vs Base Rent": ("Tenant Sales Declaration", [PROPERTY, CUSTOMER, f_date("from_date", "From", "frappe.datetime.add_months(frappe.datetime.month_start(), -11)"), f_date("to_date", "To", "frappe.datetime.month_end()")], 0),
}


def js_filter(spec):
    lines = [f'\t\t\tfieldname: "{spec["fieldname"]}"', f'\t\t\tlabel: __("{spec["label"]}")', f'\t\t\tfieldtype: "{spec["fieldtype"]}"']
    if spec.get("options"):
        options = spec["options"].replace("\n", "\\n")
        lines.append(f'\t\t\toptions: "{options}"')
    if spec.get("reqd"):
        lines.append("\t\t\treqd: 1")
    default = spec.get("default")
    if default not in (None, ""):
        if isinstance(default, int):
            lines.append(f"\t\t\tdefault: {default}")
        elif default.startswith("frappe."):
            lines.append(f"\t\t\tdefault: {default}")
        else:
            lines.append(f'\t\t\tdefault: "{default}"')
    return "\t\t{\n" + ",\n".join(lines) + ",\n\t\t}"


def build_reports():
    for name, (ref_doctype, filters, accounts_only) in REPORTS.items():
        key = scrub(name)
        folder = BASE / "report" / key
        roles = ["Property Manager", "Property Accountant", "System Manager", "Accounts Manager", "Accounts User"] if accounts_only else ROLES + ["Accounts User"]
        write(
            folder / f"{key}.json",
            {
                "add_total_row": 0,
                "columns": [],
                "creation": STAMP,
                "disabled": 0,
                "docstatus": 0,
                "doctype": "Report",
                "filters": [],
                "idx": 0,
                "is_standard": "Yes",
                "modified": STAMP,
                "modified_by": "Administrator",
                "module": MODULE,
                "name": name,
                "owner": "Administrator",
                "prepared_report": 0,
                "ref_doctype": ref_doctype,
                "report_name": name,
                "report_type": "Script Report",
                "roles": [{"role": role} for role in roles],
            },
        )
        body = ",\n".join(js_filter(spec) for spec in filters)
        write(folder / f"{key}.js", f'frappe.query_reports["{name}"] = {{\n\tfilters: [\n{body}\n\t],\n}};\n')
        ts_body = body.replace("\t", "  ")
        write(
            FRONTEND / "report" / key / f"{key}.ts",
            f"import {{ __, frappe }} from '@/shared/frappe'\n\nfrappe.query_reports['{name}'] = {{\n  filters: [\n{ts_body}\n  ],\n}}\n",
        )
        (folder / "__init__.py").touch()


def number_card(name, document_type, function, label, filters="[]", aggregate=None, color="#b8860b", stats="Monthly", percentage=0, type_="Document Type", method=None):
    card = {
        "creation": STAMP,
        "docstatus": 0,
        "doctype": "Number Card",
        "document_type": document_type,
        "dynamic_filters_json": "[]",
        "filters_json": filters,
        "function": function,
        "idx": 0,
        "is_public": 1,
        "is_standard": 1,
        "label": label,
        "modified": STAMP,
        "modified_by": "Administrator",
        "module": MODULE,
        "name": name,
        "owner": "Administrator",
        "show_percentage_stats": percentage,
        "stats_time_interval": stats,
        "type": type_,
        "show_full_number": 0,
        "color": color,
    }
    if aggregate:
        card["aggregate_function_based_on"] = aggregate
    if method:
        card["method"] = method
        card["type"] = "Custom"
    return card


CARDS = [
    number_card("Occupied Units", "Rentable Unit", "Count", "Occupied Units", '[["Rentable Unit","status","=","Occupied",false]]', color="#16a34a"),
    number_card("Vacant Units", "Rentable Unit", "Count", "Vacant Units", '[["Rentable Unit","status","=","Vacant",false]]', color="#f59e0b"),
    number_card("Active Leases", "Lease Agreement", "Count", "Active Leases", '[["Lease Agreement","status","in",["Active","Expiring Soon"],false],["Lease Agreement","docstatus","=",1,false]]', color="#2563eb"),
    number_card("Leases Expiring Soon", "Lease Agreement", "Count", "Leases Expiring Soon", '[["Lease Agreement","status","=","Expiring Soon",false],["Lease Agreement","docstatus","=",1,false]]', color="#dc2626"),
    number_card("Monthly Rent Roll", "Lease Agreement", "Sum", "Monthly Rent Roll", '[["Lease Agreement","status","in",["Active","Expiring Soon"],false],["Lease Agreement","docstatus","=",1,false]]', aggregate="total_monthly_rent", color="#b8860b"),
    number_card("Rent Arrears", "Lease Agreement", "Sum", "Rent Arrears", '[["Lease Agreement","docstatus","=",1,false]]', aggregate="overdue_amount", color="#dc2626"),
    number_card("Open Maintenance Requests", "Maintenance Request", "Count", "Open Maintenance Requests", '[["Maintenance Request","status","in",["Open","Assigned","In Progress","On Hold"],false]]', color="#f59e0b"),
    number_card("Pending Meter Readings", "Meter Reading", "Count", "Readings to Approve", '[["Meter Reading","status","=","Pending Approval",false]]', color="#7c3aed"),
    number_card("Unmatched M-Pesa Payments", "Mpesa Payment", "Count", "Unmatched M-Pesa Payments", '[["Mpesa Payment","status","=","Unmatched",false]]', color="#dc2626"),
    number_card("New Space Enquiries", "Space Enquiry", "Count", "Open Enquiries", '[["Space Enquiry","status","not in",["Won","Lost"],false]]', color="#0891b2"),
]


def chart(name, document_type, type_, chart_type, **kw):
    base = {
        "based_on": kw.pop("based_on", ""),
        "chart_name": name,
        "chart_type": chart_type,
        "creation": STAMP,
        "docstatus": 0,
        "doctype": "Dashboard Chart",
        "document_type": document_type,
        "dynamic_filters_json": "[]",
        "filters_json": kw.pop("filters_json", "[]"),
        "idx": 0,
        "is_public": 1,
        "is_standard": 1,
        "modified": STAMP,
        "modified_by": "Administrator",
        "module": MODULE,
        "name": name,
        "owner": "Administrator",
        "roles": [{"role": role} for role in ROLES],
        "show_values_over_chart": 0,
        "source": "",
        "type": type_,
        "use_report_chart": 0,
        "y_axis": [],
    }
    base.update(kw)
    return base


CHARTS = [
    chart("Units by Status", "Rentable Unit", "Donut", "Group By", group_by_based_on="status", group_by_type="Count", number_of_groups=0, timeseries=0, color="#b8860b"),
    chart("Leases by Status", "Lease Agreement", "Pie", "Group By", group_by_based_on="status", group_by_type="Count", number_of_groups=0, timeseries=0, filters_json='[["Lease Agreement","docstatus","=",1,false]]'),
    chart("Rent Billed by Month", "Sales Invoice", "Bar", "Sum", based_on="posting_date", value_based_on="grand_total", time_interval="Monthly", timespan="Last Year", timeseries=1, filters_json='[["Sales Invoice","is_lease_invoice","=",1,false],["Sales Invoice","docstatus","=",1,false]]', color="#b8860b"),
    chart("Maintenance by Category", "Maintenance Request", "Pie", "Group By", group_by_based_on="category", group_by_type="Count", number_of_groups=0, timeseries=0),
    chart("New Leases by Month", "Lease Agreement", "Line", "Count", based_on="start_date", time_interval="Monthly", timespan="Last Year", timeseries=1, filters_json='[["Lease Agreement","docstatus","=",1,false]]'),
]

QUICK_LISTS = [
    ("Lease Agreement", "Expiring Leases", '[["Lease Agreement","status","=","Expiring Soon",false],["Lease Agreement","docstatus","=",1,false]]'),
    ("Maintenance Request", "Open Maintenance", '[["Maintenance Request","status","in",["Open","Assigned","In Progress"],false]]'),
    ("Space Enquiry", "Fresh Enquiries", '[["Space Enquiry","status","in",["New","Contacted"],false]]'),
]


def build_cards_and_charts():
    for card in CARDS:
        write(BASE / "number_card" / scrub(card["name"]) / f"{scrub(card['name'])}.json", card)
    for item in CHARTS:
        write(BASE / "dashboard_chart" / scrub(item["name"]) / f"{scrub(item['name'])}.json", item)
    dash_charts = [{"chart": item["name"], "width": "Half", "doctype": "Dashboard Chart Link"} for item in CHARTS]
    dash_cards = [{"card": card["name"], "doctype": "Number Card Link"} for card in CARDS[:8]]
    write(
        BASE / "dashboard" / "property_management" / "property_management.json",
        {
            "cards": dash_cards,
            "charts": dash_charts,
            "creation": STAMP,
            "dashboard_name": "Property Management",
            "docstatus": 0,
            "doctype": "Dashboard",
            "idx": 0,
            "is_default": 0,
            "is_standard": 1,
            "modified": STAMP,
            "modified_by": "Administrator",
            "module": MODULE,
            "name": "Property Management",
            "owner": "Administrator",
        },
    )


def block(kind, key, value, col):
    return {"id": hashlib.md5(f"{kind}{value}".encode()).hexdigest()[:10], "type": kind, "data": {key: value, "col": col}}


def build_workspace():
    content = [
        block("onboarding", "onboarding_name", "Property Management Onboarding", 12),
        block("number_card", "number_card_name", "Occupied Units", 3),
        block("number_card", "number_card_name", "Vacant Units", 3),
        block("number_card", "number_card_name", "Monthly Rent Roll", 3),
        block("number_card", "number_card_name", "Rent Arrears", 3),
        block("chart", "chart_name", "Units by Status", 4),
        block("chart", "chart_name", "Rent Billed by Month", 8),
        block("quick_list", "quick_list_name", "Expiring Leases", 4),
        block("quick_list", "quick_list_name", "Open Maintenance", 4),
        block("quick_list", "quick_list_name", "Fresh Enquiries", 4),
    ]
    rows = lambda items, parentfield, doctype, extra: [
        {"name": f"{parentfield}{i}", "owner": "Administrator", "creation": STAMP, "modified": STAMP, "modified_by": "Administrator", "docstatus": 0, "idx": i + 1, "parent": "Property Management", "parentfield": parentfield, "parenttype": "Workspace", "doctype": doctype, **extra(item)}
        for i, item in enumerate(items)
    ]
    write(
        BASE / "workspace" / "property_management" / "property_management.json",
        {
            "app": "bbs_property",
            "charts": rows(["Units by Status", "Rent Billed by Month"], "charts", "Workspace Chart", lambda n: {"chart_name": n, "label": n}),
            "content": json.dumps(content),
            "creation": STAMP,
            "custom_blocks": [],
            "docstatus": 0,
            "doctype": "Workspace",
            "for_user": "",
            "hide_custom": 0,
            "icon": "building",
            "idx": 0,
            "is_hidden": 0,
            "label": "Property Management",
            "links": [],
            "modified": STAMP,
            "modified_by": "Administrator",
            "module": MODULE,
            "name": "Property Management",
            "number_cards": rows(["Occupied Units", "Vacant Units", "Monthly Rent Roll", "Rent Arrears"], "number_cards", "Workspace Number Card", lambda n: {"number_card_name": n, "label": n}),
            "owner": "Administrator",
            "parent_page": "",
            "public": 1,
            "quick_lists": rows(QUICK_LISTS, "quick_lists", "Workspace Quick List", lambda q: {"document_type": q[0], "label": q[1], "quick_list_filter": q[2]}),
            "roles": [],
            "shortcuts": [],
        },
    )


def item(label, link_to, link_type, icon=None, child=0, indent=0, **extra):
    row = {"added": 0, "hidden": 0, "label": label, "link_to": link_to, "link_type": link_type, "type": "Link", "child": child, "collapsible": 1, "indent": indent, "keep_closed": 0, "show_arrow": 0, "open_in_new_tab": 0, "is_default_module": 0}
    if icon:
        row["icon"] = icon
    row.update(extra)
    return row


def section(label, icon, keep_closed=0):
    return {"added": 0, "hidden": 0, "label": label, "link_type": "DocType", "type": "Section Break", "icon": icon, "child": 0, "collapsible": 1, "indent": 1, "keep_closed": keep_closed, "show_arrow": 0, "open_in_new_tab": 0, "is_default_module": 0}


def build_sidebar():
    items = [
        item("Home", "Property Management", "Workspace", "house"),
        item("Dashboard", "Property Management", "Dashboard", "layout-dashboard"),
        section("Space", "building-2"),
        item("Property", "Property", "DocType", child=1),
        item("Floors", "Property Floor", "DocType", child=1),
        item("Rentable Units", "Rentable Unit", "DocType", child=1),
        section("Leasing", "file-signature"),
        item("Space Enquiries", "Space Enquiry", "DocType", child=1),
        item("Lease Agreements", "Lease Agreement", "DocType", child=1),
        item("Tenant Notices", "Tenant Notice", "DocType", child=1),
        section("Billing and Payments", "receipt"),
        item("Lease Billing Runs", "Lease Billing Run", "DocType", child=1),
        item("Lease Deposits", "Lease Deposit", "DocType", child=1),
        item("M-Pesa Payments", "Mpesa Payment", "DocType", child=1),
        section("Utilities", "zap"),
        item("Utility Meters", "Utility Meter", "DocType", child=1),
        item("Meter Readings", "Meter Reading", "DocType", child=1),
        item("Utility Tariffs", "Utility Tariff", "DocType", child=1),
        item("Turnover Declarations", "Tenant Sales Declaration", "DocType", child=1),
        section("Maintenance", "wrench"),
        item("Maintenance Requests", "Maintenance Request", "DocType", child=1),
        section("Reports", "notepad-text", keep_closed=1),
    ]
    for name in REPORTS:
        items.append(item(name, name, "Report", child=1))
    items.append(item("Settings", "Property Settings", "DocType", "settings"))
    write(
        BASE / "sidebar" / "property_management" / "property_management.json",
        {
            "app": "bbs_property",
            "creation": STAMP,
            "docstatus": 0,
            "doctype": "Sidebar",
            "header_icon": "building-duotone",
            "idx": 0,
            "items": items,
            "modified": STAMP,
            "modified_by": "Administrator",
            "module": MODULE,
            "name": "Property Management",
            "owner": "Administrator",
            "standard": 1,
            "title": "Property Management",
        },
    )
    write(
        ROOT / "dock" / "bbs_property" / "bbs_property.json",
        {
            "app": "bbs_property",
            "creation": STAMP,
            "docstatus": 0,
            "doctype": "Dock",
            "idx": 0,
            "items": [{"added": 0, "hidden": 0, "icon": "building-duotone", "link_to": "Property Management", "link_type": "Sidebar", "title": "Property Management"}],
            "modified": STAMP,
            "modified_by": "Administrator",
            "name": "bbs_property",
            "owner": "Administrator",
            "standard": 1,
            "user": "",
        },
    )


STEPS = [
    ("Create Property", "Describe your mall or building", "Create Entry", "Add Property", "Property", "The mall or building you lease space in. Set the company, cost center and the accounts rent posts to. See [Property](/desk/property)."),
    ("Create Rentable Units", "Add your shops and spaces", "Create Entry", "Add Unit", "Rentable Unit", "Each shop, kiosk or stall you can let, with its area and base rent. See [Rentable Unit](/desk/rentable-unit)."),
    ("Configure Property Settings", "Set invoicing items and M-Pesa", "Update Settings", "Open Settings", "Property Settings", "Choose the rent and service charge items, late fee rules and your M-Pesa details so billing and payments run by themselves."),
    ("Create Lease Agreement", "Lease a unit to a tenant", "Create Entry", "Create Lease", "Lease Agreement", "Pick the tenant, units, rent, escalation and deposit. Submitting occupies the units and starts the billing schedule."),
    ("Run Lease Billing", "Invoice the rent", "Create Entry", "Start Billing Run", "Lease Billing Run", "Preview the leases that are due and issue their invoices in one go. Invoices are also created automatically every day."),
    ("View Rent Roll", "See who occupies what", "View Report", "Open Rent Roll", None, "A live list of every unit, tenant, rent and balance."),
]


def build_onboarding():
    steps = []
    for index, (name, title, action, label, reference, description) in enumerate(STEPS):
        step = {
            "name": name,
            "owner": "Administrator",
            "creation": STAMP,
            "modified": STAMP,
            "modified_by": "Administrator",
            "docstatus": 0,
            "idx": 0,
            "title": title,
            "is_complete": 0,
            "is_skipped": 0,
            "description": description,
            "action": action,
            "action_label": label,
            "show_full_form": 1,
            "show_form_tour": 0,
            "is_single": 1 if reference == "Property Settings" else 0,
            "validate_action": 0 if action == "View Report" else 1,
            "doctype": "Onboarding Step",
        }
        if action == "View Report":
            step["reference_report"] = "Rent Roll"
        else:
            step["reference_document"] = reference
        write(BASE / "onboarding_step" / scrub(name) / f"{scrub(name)}.json", step)
        steps.append(
            {
                "name": f"pmstep{index}",
                "owner": "Administrator",
                "creation": STAMP,
                "modified": STAMP,
                "modified_by": "Administrator",
                "docstatus": 0,
                "idx": index + 1,
                "step": name,
                "is_optional": 1 if name in ("Run Lease Billing", "View Rent Roll") else 0,
                "parent": "Property Management Onboarding",
                "parentfield": "steps",
                "parenttype": "Module Onboarding",
                "doctype": "Onboarding Step Map",
            }
        )
    roles = [
        {"name": f"pmrole{i}", "owner": "Administrator", "creation": STAMP, "modified": STAMP, "modified_by": "Administrator", "docstatus": 0, "idx": i + 1, "role": role, "parent": "Property Management Onboarding", "parentfield": "allow_roles", "parenttype": "Module Onboarding", "doctype": "Onboarding Permission"}
        for i, role in enumerate(["Property Manager", "System Manager"])
    ]
    write(
        BASE / "module_onboarding" / "property_management_onboarding" / "property_management_onboarding.json",
        {
            "name": "Property Management Onboarding",
            "owner": "Administrator",
            "creation": STAMP,
            "modified": STAMP,
            "modified_by": "Administrator",
            "docstatus": 0,
            "idx": 0,
            "title": "Get your property leasing running",
            "module": MODULE,
            "is_complete": 0,
            "doctype": "Module Onboarding",
            "allow_roles": roles,
            "steps": steps,
        },
    )


def main():
    build_reports()
    build_cards_and_charts()
    build_workspace()
    build_sidebar()
    build_onboarding()
    print("artifacts written")


if __name__ == "__main__":
    main()
