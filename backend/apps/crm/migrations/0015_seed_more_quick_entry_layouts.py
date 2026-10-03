# Continuation of 0010_seed_quick_entry_layouts.py -- crm/install.py's
# add_default_fields_layout() (frappe/crm, AGPL-3.0) seeds Quick Entry
# layouts for six doctypes; migration 0010 only carried over CRM Lead/CRM
# Deal. This adds the other three whose "Create X" modal exists in this port
# (CRM Call Log, FCRM Note, CRM Task) -- Contact/CRM Organization/Address
# left for a follow-up pass.
#
# One deliberate field-name change from the vendor layout: CRM Call Log's
# "from"/"to" fields are named `from_number`/`to_number` on our Django model
# (see apps/crm/doctype/call_log/call_log.py -- `from`/`to` are Python
# keywords), and get_doctype_meta() derives Quick Entry Modal field names
# directly from the Django model's own field names, so the layout must
# reference `from_number`/`to_number` to resolve against that meta and
# render as real inputs. `caller`/`receiver` are unchanged (same names on
# both sides).
import json

from django.db import migrations

QUICK_ENTRY_LAYOUTS = {
    "CRM Call Log-Quick Entry": {
        "doctype": "CRM Call Log",
        "layout": [
            {
                "name": "details_section",
                "columns": [
                    {"name": "column_uMSG", "fields": ["type", "from_number", "duration"]},
                    {"name": "column_wiZT", "fields": ["to_number", "status", "caller", "receiver"]},
                ],
            },
        ],
    },
    "FCRM Note-Quick Entry": {
        "doctype": "FCRM Note",
        "layout": [
            {
                "name": "details_section",
                "columns": [{"name": "column_o2s9", "fields": ["title", "content"]}],
            },
        ],
    },
    "CRM Task-Quick Entry": {
        "doctype": "CRM Task",
        "layout": [
            {
                "name": "first_tab",
                "sections": [
                    {
                        "name": "details_section",
                        "columns": [{"name": "column_X9sG", "fields": ["title", "description"]}],
                    },
                    {
                        "name": "assignment_section",
                        "columns": [
                            {"name": "column_9XjK", "fields": ["priority", "due_date"]},
                            {"name": "column_7s8n", "fields": ["assigned_to", "status"]},
                        ],
                        "hideBorder": True,
                    },
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
    dependencies = [("crm", "0014_crmnotification")]
    operations = [migrations.RunPython(seed, unseed)]
