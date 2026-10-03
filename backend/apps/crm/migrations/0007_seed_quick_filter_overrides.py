# Seeds QuickFilterOverride with the in_standard_filter:1 flags read directly
# from the original doctype JSONs (crm_lead.json, crm_deal.json,
# crm_organization.json -- frappe/crm, AGPL-3.0), since Django has no
# Property-Setter-style per-field metadata to read this from natively.
from django.db import migrations

DEFAULTS = {
    "CRM Lead": ["status", "email", "organization", "converted", "lead_temperature"],
    "CRM Deal": ["organization", "status"],
    "CRM Organization": ["organization_name", "no_of_employees", "industry", "territory"],
}


def seed(apps, schema_editor):
    QuickFilterOverride = apps.get_model("crm", "QuickFilterOverride")
    for doctype_label, fieldnames in DEFAULTS.items():
        for fieldname in fieldnames:
            QuickFilterOverride.objects.get_or_create(
                doctype_label=doctype_label, fieldname=fieldname, defaults={"in_standard_filter": True}
            )


def unseed(apps, schema_editor):
    QuickFilterOverride = apps.get_model("crm", "QuickFilterOverride")
    for doctype_label, fieldnames in DEFAULTS.items():
        QuickFilterOverride.objects.filter(doctype_label=doctype_label, fieldname__in=fieldnames).delete()


class Migration(migrations.Migration):
    dependencies = [("crm", "0006_crmformscript_crmglobalsettings_crmviewsettings_and_more")]
    operations = [migrations.RunPython(seed, unseed)]
