# Address-Quick Entry from crm/install.py's add_default_fields_layout()
# (frappe/crm, AGPL-3.0) -- drives the "Create Address" modal opened from
# Contact/CRM Organization's Address Link field.
import json

from django.db import migrations

LAYOUT = [
    {
        "name": "details_section",
        "columns": [{"name": "column_uSSG", "fields": ["address_title", "address_type", "address_line1", "address_line2"]}],
    },
    {
        "name": "location_section", "hideBorder": True,
        "columns": [
            {"name": "column_TCoZ", "fields": ["country", "city"]},
            {"name": "column_PqrK", "fields": ["state", "pincode"]},
        ],
    },
]


def seed(apps, schema_editor):
    CRMFieldsLayout = apps.get_model("crm", "CRMFieldsLayout")
    CRMFieldsLayout.objects.get_or_create(
        name="Address-Quick Entry",
        defaults={"dt": "Address", "type": "Quick Entry", "layout": json.dumps(LAYOUT)},
    )


def unseed(apps, schema_editor):
    CRMFieldsLayout = apps.get_model("crm", "CRMFieldsLayout")
    CRMFieldsLayout.objects.filter(name="Address-Quick Entry").delete()


class Migration(migrations.Migration):
    dependencies = [("crm", "0020_alter_crmlead_gender_alter_crmlead_salutation")]
    operations = [migrations.RunPython(seed, unseed)]
