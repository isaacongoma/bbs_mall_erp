# Seeds CRM Fields Layout with the "Data Fields" layouts from crm/install.py's
# add_default_fields_layout() (frappe/crm, AGPL-3.0) -- these drive the
# "Data" tab's grouped (Details/Person) full-width form on the Lead/Deal
# detail pages, as opposed to a flat dump of every field. Field names
# verified against this port's actual Django model fields. CRM Deal's
# "products" field (a line-items child table) isn't modeled on CRMDeal in
# this port, so that column/section is left out rather than referencing a
# field that doesn't exist (get_fields_layout already no-ops on unknown
# fieldnames, but there is no reason to seed one deliberately).
import json

from django.db import migrations

DATA_FIELDS_LAYOUTS = {
    "CRM Lead-Data Fields": {
        "doctype": "CRM Lead",
        "layout": [
            {
                "label": "Details", "name": "details_section", "opened": True,
                "columns": [
                    {"name": "column_ZgLG", "fields": ["organization", "company_description", "industry", "no_of_employees"]},
                    {"name": "column_TbYq", "fields": ["website", "linkedin", "twitter", "facebook", "job_title"]},
                    {"name": "column_OKSX", "fields": ["territory", "source", "lead_owner"]},
                ],
            },
            {
                "label": "Person", "name": "person_section", "opened": True,
                "columns": [
                    {"name": "column_6c5g", "fields": ["salutation", "email"]},
                    {"name": "column_1n7Q", "fields": ["first_name", "mobile_no"]},
                    {"name": "column_cT6C", "fields": ["last_name"]},
                ],
            },
        ],
    },
    "CRM Deal-Data Fields": {
        "doctype": "CRM Deal",
        "layout": [{
            "name": "first_tab",
            "sections": [
                {
                    "label": "Details", "name": "details_section", "opened": True,
                    "columns": [
                        {"name": "column_z9XL", "fields": ["organization", "company_description", "industry", "no_of_employees", "annual_revenue"]},
                        {"name": "column_gM4w", "fields": ["website", "linkedin", "twitter", "facebook", "closed_date", "next_step"]},
                        {"name": "column_gWmE", "fields": ["territory", "probability", "deal_owner"]},
                    ],
                },
                {
                    "label": "New Section", "name": "section_WNOQ", "opened": True, "hideBorder": True, "hideLabel": True,
                    "columns": [
                        {"name": "column_ziBW", "fields": ["total"]},
                        {"label": "", "name": "column_wuwA", "fields": ["net_total"]},
                    ],
                },
            ],
        }],
    },
}


def seed(apps, schema_editor):
    CRMFieldsLayout = apps.get_model("crm", "CRMFieldsLayout")
    for name, entry in DATA_FIELDS_LAYOUTS.items():
        CRMFieldsLayout.objects.get_or_create(
            name=name,
            defaults={"dt": entry["doctype"], "type": "Data Fields", "layout": json.dumps(entry["layout"])},
        )


def unseed(apps, schema_editor):
    CRMFieldsLayout = apps.get_model("crm", "CRMFieldsLayout")
    CRMFieldsLayout.objects.filter(name__in=DATA_FIELDS_LAYOUTS.keys()).delete()


class Migration(migrations.Migration):
    dependencies = [("crm", "0011_seed_side_panel_layouts")]
    operations = [migrations.RunPython(seed, unseed)]
