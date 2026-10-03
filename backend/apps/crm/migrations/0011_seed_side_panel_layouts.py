# Seeds CRM Fields Layout with the Side Panel layouts from crm/install.py's
# add_default_fields_layout() (frappe/crm, AGPL-3.0) -- these drive the
# Details/Person right-hand panel on the Lead/Deal detail pages. Field names
# verified against this port's actual Django model fields, same as
# 0010_seed_quick_entry_layouts.py. CRM Deal's "Contacts" section (a
# dynamic contacts-list block, not a plain field column) is left out since
# it isn't representable by this layout format's columns/fields shape.
import json

from django.db import migrations

SIDE_PANEL_LAYOUTS = {
    "CRM Lead-Side Panel": {
        "doctype": "CRM Lead",
        "layout": [
            {
                "label": "Details", "name": "details_section", "opened": True,
                "columns": [{
                    "name": "column_kl92",
                    "fields": [
                        "organization", "company_description", "website", "territory",
                        "industry", "no_of_employees", "job_title", "source", "lead_owner",
                        "linkedin", "twitter", "facebook",
                    ],
                }],
            },
            {
                "label": "Person", "name": "person_section", "opened": True,
                "columns": [{
                    "name": "column_XmW2",
                    "fields": ["salutation", "first_name", "last_name", "email", "mobile_no"],
                }],
            },
        ],
    },
    "CRM Deal-Side Panel": {
        "doctype": "CRM Deal",
        "layout": [
            {
                "label": "Organization Details", "name": "organization_section", "opened": True,
                "columns": [{
                    "name": "column_na2Q",
                    "fields": [
                        "organization", "company_description", "industry", "no_of_employees",
                        "website", "territory", "annual_revenue", "closed_date", "probability",
                        "next_step", "deal_owner", "linkedin", "twitter", "facebook",
                    ],
                }],
            },
        ],
    },
}


def seed(apps, schema_editor):
    CRMFieldsLayout = apps.get_model("crm", "CRMFieldsLayout")
    for name, entry in SIDE_PANEL_LAYOUTS.items():
        CRMFieldsLayout.objects.get_or_create(
            name=name,
            defaults={"dt": entry["doctype"], "type": "Side Panel", "layout": json.dumps(entry["layout"])},
        )


def unseed(apps, schema_editor):
    CRMFieldsLayout = apps.get_model("crm", "CRMFieldsLayout")
    CRMFieldsLayout.objects.filter(name__in=SIDE_PANEL_LAYOUTS.keys()).delete()


class Migration(migrations.Migration):
    dependencies = [("crm", "0010_seed_quick_entry_layouts")]
    operations = [migrations.RunPython(seed, unseed)]
