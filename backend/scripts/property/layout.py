import hashlib
import json

import build_artifacts as ba
from dsl import MODULE, STAMP, scrub

TARGETS = {
    "Floors": "Property Floor",
    "Rentable Units": "Rentable Unit",
    "Space Enquiries": "Space Enquiry",
    "Lease Agreements": "Lease Agreement",
    "Turnover Declarations": "Tenant Sales Declaration",
    "Tenant Notices": "Tenant Notice",
    "Lease Billing Runs": "Lease Billing Run",
    "Lease Deposits": "Lease Deposit",
    "M-Pesa Payments": "Mpesa Payment",
    "Utility Meters": "Utility Meter",
    "Meter Readings": "Meter Reading",
    "Utility Tariffs": "Utility Tariff",
    "Maintenance Requests": "Maintenance Request",
}

MODULES = [
    {
        "sidebar": "Property",
        "workspace": "Property Management",
        "icon": "building-duotone",
        "workspace_icon": "building",
        "dashboard": "Property Management",
        "blocks": [
            ("onboarding", "onboarding_name", "Property Management Onboarding", 12),
            ("number_card", "number_card_name", "Occupied Units", 3),
            ("number_card", "number_card_name", "Vacant Units", 3),
            ("number_card", "number_card_name", "Monthly Rent Roll", 3),
            ("number_card", "number_card_name", "Rent Arrears", 3),
            ("chart", "chart_name", "Units by Status", 4),
            ("chart", "chart_name", "Rent Billed by Month", 8),
        ],
        "cards": ["Occupied Units", "Vacant Units", "Monthly Rent Roll", "Rent Arrears"],
        "charts": ["Units by Status", "Rent Billed by Month"],
        "quick_lists": [],
        "items": [("Property", "building-2"), ("Floors", "layers"), ("Rentable Units", "store")],
        "reports": ["Rent Roll", "Occupancy and Vacancy", "Revenue per Sqm"],
        "settings": True,
    },
    {
        "sidebar": "Leasing",
        "workspace": "Leasing",
        "icon": "lease-duotone",
        "workspace_icon": "file-signature",
        "blocks": [
            ("number_card", "number_card_name", "Active Leases", 4),
            ("number_card", "number_card_name", "Leases Expiring Soon", 4),
            ("number_card", "number_card_name", "New Space Enquiries", 4),
            ("chart", "chart_name", "Leases by Status", 4),
            ("chart", "chart_name", "New Leases by Month", 8),
            ("quick_list", "quick_list_name", "Expiring Leases", 6),
            ("quick_list", "quick_list_name", "Fresh Enquiries", 6),
        ],
        "cards": ["Active Leases", "Leases Expiring Soon", "New Space Enquiries"],
        "charts": ["Leases by Status", "New Leases by Month"],
        "quick_lists": ["Expiring Leases", "Fresh Enquiries"],
        "items": [
            ("Space Enquiries", "user-search"),
            ("Lease Agreements", "file-signature"),
            ("Turnover Declarations", "chart-no-axes-combined"),
            ("Tenant Notices", "megaphone"),
        ],
        "reports": ["Lease Expiry", "Turnover vs Base Rent"],
    },
    {
        "sidebar": "Rent Billing",
        "workspace": "Rent Billing",
        "icon": "billing-duotone",
        "workspace_icon": "receipt",
        "blocks": [
            ("number_card", "number_card_name", "Monthly Rent Roll", 4),
            ("number_card", "number_card_name", "Rent Arrears", 4),
            ("number_card", "number_card_name", "Unmatched M-Pesa Payments", 4),
            ("chart", "chart_name", "Rent Billed by Month", 12),
        ],
        "cards": ["Monthly Rent Roll", "Rent Arrears", "Unmatched M-Pesa Payments"],
        "charts": ["Rent Billed by Month"],
        "quick_lists": [],
        "items": [("Lease Billing Runs", "receipt-text"), ("Lease Deposits", "piggy-bank"), ("M-Pesa Payments", "smartphone")],
        "reports": ["Tenant Arrears Aging", "Collection Efficiency", "Tenant Statement", "Deposit Ledger"],
    },
    {
        "sidebar": "Property Utilities",
        "workspace": "Property Utilities",
        "icon": "utilities-duotone",
        "workspace_icon": "zap",
        "blocks": [("number_card", "number_card_name", "Pending Meter Readings", 4)],
        "cards": ["Pending Meter Readings"],
        "charts": [],
        "quick_lists": [],
        "items": [("Utility Meters", "gauge"), ("Meter Readings", "clipboard-list"), ("Utility Tariffs", "badge-percent")],
        "reports": ["Utility Consumption"],
    },
    {
        "sidebar": "Property Maintenance",
        "workspace": "Property Maintenance",
        "icon": "maintenance-duotone",
        "workspace_icon": "wrench",
        "blocks": [
            ("number_card", "number_card_name", "Open Maintenance Requests", 4),
            ("chart", "chart_name", "Maintenance by Category", 8),
            ("quick_list", "quick_list_name", "Open Maintenance", 12),
        ],
        "cards": ["Open Maintenance Requests"],
        "charts": ["Maintenance by Category"],
        "quick_lists": ["Open Maintenance"],
        "items": [("Maintenance Requests", "wrench")],
        "reports": ["Maintenance Summary"],
    },
]


def block(kind, key, value, col):
    return {"id": hashlib.md5(f"{kind}{value}".encode()).hexdigest()[:10], "type": kind, "data": {key: value, "col": col}}


def rows(entries, parent, parentfield, doctype, extra):
    return [
        {
            "name": f"{scrub(parent)}-{parentfield}{index}",
            "owner": "Administrator",
            "creation": STAMP,
            "modified": STAMP,
            "modified_by": "Administrator",
            "docstatus": 0,
            "idx": index + 1,
            "parent": parent,
            "parentfield": parentfield,
            "parenttype": "Workspace",
            "doctype": doctype,
            **extra(entry),
        }
        for index, entry in enumerate(entries)
    ]


def module_names():
    return [module["workspace"] for module in MODULES]


def build_workspaces():
    quick = {name: (doc, flt) for doc, name, flt in ba.QUICK_LISTS}
    for module in MODULES:
        name = module["workspace"]
        ba.write(
            ba.ROOT / scrub(module["workspace"]) / "workspace" / scrub(name) / f"{scrub(name)}.json",
            {
                "app": "bbs_property",
                "charts": rows(module["charts"], name, "charts", "Workspace Chart", lambda n: {"chart_name": n, "label": n}),
                "content": json.dumps([block(*entry) for entry in module["blocks"]]),
                "creation": STAMP,
                "custom_blocks": [],
                "docstatus": 0,
                "doctype": "Workspace",
                "for_user": "",
                "hide_custom": 0,
                "icon": module["workspace_icon"],
                "idx": 0,
                "is_hidden": 0,
                "label": name,
                "links": [],
                "modified": STAMP,
                "modified_by": "Administrator",
                "module": module["workspace"],
                "name": name,
                "number_cards": rows(module["cards"], name, "number_cards", "Workspace Number Card", lambda n: {"number_card_name": n, "label": n}),
                "owner": "Administrator",
                "parent_page": "",
                "public": 1,
                "quick_lists": rows(module["quick_lists"], name, "quick_lists", "Workspace Quick List", lambda n: {"document_type": quick[n][0], "label": n, "quick_list_filter": quick[n][1]}),
                "roles": [],
                "shortcuts": [],
            },
        )


def build_sidebars():
    for module in MODULES:
        items = [ba.item("Home", module["workspace"], "Workspace", "house")]
        if module.get("dashboard"):
            items.append(ba.item("Dashboard", module["dashboard"], "Dashboard", "layout-dashboard"))
        for label, icon in module["items"]:
            items.append(ba.item(label, TARGETS.get(label, label), "DocType", icon))
        items.append(ba.section("Reports", "notepad-text"))
        for report in module["reports"]:
            items.append(ba.item(report, report, "Report", child=1))
        if module.get("settings"):
            items.append(ba.item("Settings", "Property Settings", "DocType", "settings"))
        ba.write(
            ba.ROOT / scrub(module["workspace"]) / "sidebar" / scrub(module["sidebar"]) / f"{scrub(module['sidebar'])}.json",
            {
                "app": "bbs_property",
                "creation": STAMP,
                "docstatus": 0,
                "doctype": "Sidebar",
                "header_icon": module["icon"],
                "idx": 0,
                "items": items,
                "modified": STAMP,
                "modified_by": "Administrator",
                "module": module["workspace"],
                "name": module["sidebar"],
                "owner": "Administrator",
                "standard": 1,
                "title": module["sidebar"],
            },
        )
    ba.write(
        ba.ROOT / "dock" / "bbs_property" / "bbs_property.json",
        {
            "app": "bbs_property",
            "creation": STAMP,
            "docstatus": 0,
            "doctype": "Dock",
            "idx": 0,
            "items": [{"added": 0, "hidden": 0, "icon": m["icon"], "link_to": m["sidebar"], "link_type": "Sidebar", "title": m["sidebar"]} for m in MODULES],
            "modified": STAMP,
            "modified_by": "Administrator",
            "name": "bbs_property",
            "owner": "Administrator",
            "standard": 1,
            "user": "",
        },
    )
