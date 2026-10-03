# Seeds CRM Fields Layout with the Quick Entry layouts from crm/install.py's
# add_default_fields_layout() (frappe/crm, AGPL-3.0). Field names verified
# against this port's actual Django model fields (apps/crm/doctype/lead/lead.py,
# apps/crm/doctype/deal/deal.py) -- every fieldname below exists on those
# models, so the layout is carried over unchanged.
import json

from django.db import migrations

QUICK_ENTRY_LAYOUTS = {
    "CRM Lead-Quick Entry": {
        "doctype": "CRM Lead",
        "layout": [
            {
                "name": "person_section",
                "columns": [
                    {"name": "column_5jrk", "fields": ["salutation", "email"]},
                    {"name": "column_5CPV", "fields": ["first_name", "mobile_no"]},
                    {"name": "column_gXOy", "fields": ["last_name", "gender"]},
                ],
            },
            {
                "name": "organization_section",
                "columns": [
                    {"name": "column_GHfX", "fields": ["organization", "territory"]},
                    {"name": "column_hXjS", "fields": ["website", "annual_revenue", "company_description"]},
                    {"name": "column_RDNA", "fields": ["no_of_employees", "industry", "linkedin", "twitter", "facebook"]},
                ],
            },
            {
                "name": "lead_section",
                "columns": [
                    {"name": "column_EO1H", "fields": ["status"]},
                    {"name": "column_RWBe", "fields": ["lead_owner"]},
                ],
            },
        ],
    },
    "CRM Deal-Quick Entry": {
        "doctype": "CRM Deal",
        "layout": [
            {
                "name": "organization_section", "hidden": True, "editable": False,
                "columns": [
                    {"name": "column_GpMP", "fields": ["organization"]},
                    {"name": "column_FPTn", "fields": []},
                ],
            },
            {
                "name": "organization_details_section", "editable": False,
                "columns": [
                    {"name": "column_S3tQ", "fields": ["organization_name", "territory"]},
                    {"name": "column_KqV1", "fields": ["website", "annual_revenue", "company_description"]},
                    {"name": "column_1r67", "fields": ["no_of_employees", "industry", "linkedin", "twitter", "facebook"]},
                ],
            },
            {
                "name": "contact_section", "hidden": True, "editable": False,
                "columns": [
                    {"name": "column_CeXr", "fields": ["contact"]},
                    {"name": "column_yHbk", "fields": []},
                ],
            },
            {
                "name": "contact_details_section", "editable": False,
                "columns": [
                    {"name": "column_ZTWr", "fields": ["salutation", "email"]},
                    {"name": "column_tabr", "fields": ["first_name", "mobile_no"]},
                    {"name": "column_Qjdx", "fields": ["last_name", "gender"]},
                ],
            },
            {
                "name": "deal_section",
                "columns": [
                    {"name": "column_mdps", "fields": ["status"]},
                    {"name": "column_H40H", "fields": ["deal_owner"]},
                ],
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


def unseed(apps, schema_editor):
    CRMFieldsLayout = apps.get_model("crm", "CRMFieldsLayout")
    CRMFieldsLayout.objects.filter(name__in=QUICK_ENTRY_LAYOUTS.keys()).delete()


class Migration(migrations.Migration):
    dependencies = [("crm", "0009_crmfieldslayout")]
    operations = [migrations.RunPython(seed, unseed)]
