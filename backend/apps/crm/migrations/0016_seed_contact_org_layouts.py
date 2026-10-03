# Continuation of 0010/0015 -- crm/install.py's add_default_fields_layout()
# (frappe/crm, AGPL-3.0) also seeds Quick Entry + Side Panel layouts for
# Contact and CRM Organization. CRM Organization's "address" field exists
# here (apps/crm/doctype/organization/organization.py -- a plain CharField,
# not a real Link since no Address doctype is modeled) so it's kept; Contact
# has no such field at all (no Address model exists in this port), so
# "address" is dropped from both of Contact's layouts rather than pointing
# at a field that doesn't exist.
import json

from django.db import migrations

QUICK_ENTRY_LAYOUTS = {
    "Contact-Quick Entry": {
        "doctype": "Contact",
        "layout": [
            {"name": "salutation_section", "columns": [{"name": "column_eXks", "fields": ["salutation"]}]},
            {
                "name": "full_name_section", "hideBorder": True,
                "columns": [
                    {"name": "column_cSxf", "fields": ["first_name"]},
                    {"name": "column_yBc7", "fields": ["last_name"]},
                ],
            },
            {"name": "email_section", "hideBorder": True, "columns": [{"name": "column_tH3L", "fields": ["email_id"]}]},
            {
                "name": "mobile_gender_section", "hideBorder": True,
                "columns": [
                    {"name": "column_lrfI", "fields": ["mobile_no"]},
                    {"name": "column_Tx3n", "fields": ["gender"]},
                ],
            },
            {"name": "organization_section", "hideBorder": True, "columns": [{"name": "column_S0J8", "fields": ["company_name"]}]},
            {"name": "designation_section", "hideBorder": True, "columns": [{"name": "column_bsO8", "fields": ["designation"]}]},
        ],
    },
    "CRM Organization-Quick Entry": {
        "doctype": "CRM Organization",
        "layout": [
            {"name": "organization_section", "columns": [{"name": "column_zOuv", "fields": ["organization_name"]}]},
            {
                "name": "website_revenue_section", "hideBorder": True,
                "columns": [
                    {"name": "column_I5Dy", "fields": ["website", "company_description"]},
                    {"name": "column_Rgss", "fields": ["annual_revenue"]},
                ],
            },
            {"name": "territory_section", "hideBorder": True, "columns": [{"name": "column_w6ap", "fields": ["territory"]}]},
            {
                "name": "employee_industry_section", "hideBorder": True,
                "columns": [
                    {"name": "column_u5tZ", "fields": ["no_of_employees", "linkedin", "twitter"]},
                    {"name": "column_FFrT", "fields": ["industry", "facebook"]},
                ],
            },
            {"name": "address_section", "hideBorder": True, "columns": [{"name": "column_O2dk", "fields": ["address"]}]},
        ],
    },
}

SIDE_PANEL_LAYOUTS = {
    "Contact-Side Panel": {
        "doctype": "Contact",
        "layout": [
            {
                "label": "Details", "name": "details_section", "opened": True,
                "columns": [{
                    "name": "column_eIWl",
                    "fields": ["salutation", "first_name", "last_name", "email_id", "mobile_no", "gender", "company_name", "designation"],
                }],
            },
        ],
    },
    "CRM Organization-Side Panel": {
        "doctype": "CRM Organization",
        "layout": [
            {
                "label": "Details", "name": "details_section", "opened": True,
                "columns": [{
                    "name": "column_IJOV",
                    "fields": ["organization_name", "company_description", "website", "territory", "industry", "no_of_employees", "address", "linkedin", "twitter", "facebook"],
                }],
            },
        ],
    },
}


def seed(apps, schema_editor):
    CRMFieldsLayout = apps.get_model("crm", "CRMFieldsLayout")
    for name, entry in QUICK_ENTRY_LAYOUTS.items():
        CRMFieldsLayout.objects.get_or_create(
            name=name,
            defaults={"dt": entry["doctype"], "type": "Quick Entry", "layout": json.dumps(entry["layout"])},
        )
    for name, entry in SIDE_PANEL_LAYOUTS.items():
        CRMFieldsLayout.objects.get_or_create(
            name=name,
            defaults={"dt": entry["doctype"], "type": "Side Panel", "layout": json.dumps(entry["layout"])},
        )


def unseed(apps, schema_editor):
    CRMFieldsLayout = apps.get_model("crm", "CRMFieldsLayout")
    CRMFieldsLayout.objects.filter(
        name__in=list(QUICK_ENTRY_LAYOUTS.keys()) + list(SIDE_PANEL_LAYOUTS.keys())
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("crm", "0015_seed_more_quick_entry_layouts")]
    operations = [migrations.RunPython(seed, unseed)]
