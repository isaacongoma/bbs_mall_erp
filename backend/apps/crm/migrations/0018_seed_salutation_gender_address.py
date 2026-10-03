# Salutation/Gender/Address didn't exist as real doctypes until this port's
# Contact/CRM Lead/CRM Deal/CRM Organization `salutation`/`gender`/`address`
# fields were converted from plain CharFields to real Links (see those
# doctype.py files). Seeds:
# 1. The standard Salutation/Gender values Frappe ships by default.
# 2. Contact's Quick Entry / Side Panel layouts with "address" added back in
#    -- migration 0016 had to drop it since no Address doctype existed yet.
import json

from django.db import migrations

SALUTATIONS = ["Dr", "Madam", "Master", "Miss", "Mr", "Mrs", "Ms"]
GENDERS = ["Female", "Genderqueer", "Male", "Non-Conforming", "Other", "Prefer not to say", "Transgender"]

CONTACT_QUICK_ENTRY = [
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
    {"name": "address_section", "hideBorder": True, "columns": [{"name": "column_W3VY", "fields": ["address"]}]},
]

CONTACT_SIDE_PANEL = [
    {
        "label": "Details", "name": "details_section", "opened": True,
        "columns": [{
            "name": "column_eIWl",
            "fields": ["salutation", "first_name", "last_name", "email_id", "mobile_no", "gender", "company_name", "designation", "address"],
        }],
    },
]


def seed(apps, schema_editor):
    Salutation = apps.get_model("core", "Salutation")
    Gender = apps.get_model("core", "Gender")
    for s in SALUTATIONS:
        Salutation.objects.get_or_create(name=s)
    for g in GENDERS:
        Gender.objects.get_or_create(name=g)

    CRMFieldsLayout = apps.get_model("crm", "CRMFieldsLayout")
    CRMFieldsLayout.objects.filter(name="Contact-Quick Entry").update(layout=json.dumps(CONTACT_QUICK_ENTRY))
    CRMFieldsLayout.objects.filter(name="Contact-Side Panel").update(layout=json.dumps(CONTACT_SIDE_PANEL))


def unseed(apps, schema_editor):
    Salutation = apps.get_model("core", "Salutation")
    Gender = apps.get_model("core", "Gender")
    Salutation.objects.filter(name__in=SALUTATIONS).delete()
    Gender.objects.filter(name__in=GENDERS).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0017_seed_quick_filters"),
        ("core", "0005_address_gender_salutation_alter_user_options_and_more"),
    ]
    operations = [migrations.RunPython(seed, unseed)]
