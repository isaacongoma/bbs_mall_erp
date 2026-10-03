# Seeds CRM Global Settings (type="Quick Filters") from crm/install.py's
# `quick_filters` dict (frappe/crm, AGPL-3.0) -- the toolbar's per-doctype
# quick-filter inputs (Email/Status/Organization/... above the list). Without
# a CRM Global Settings record for a doctype, doc_api.get_quick_filters()
# falls back to whatever fields happen to be flagged in_standard_filter via
# QuickFilterOverride, which is a different, not-matching set -- this seeds
# the real one so the toolbar matches the original exactly.
#
# "from"/"to" (CRM Call Log) become `from_number`/`to_number`, same rename
# already applied throughout this port's Call Log layouts/API responses
# (from/to are Python keywords).
import json
import uuid

from django.db import migrations

QUICK_FILTERS = {
    "CRM Lead": ["lead_name", "email", "organization", "status", "source"],
    "CRM Deal": ["organization", "status", "probability", "email"],
    "Contact": ["status", "email_id", "phone"],
    "CRM Organization": ["organization_name", "no_of_employees", "territory", "industry"],
    "CRM Task": ["title", "priority", "assigned_to", "status", "due_date"],
    "CRM Call Log": ["telephony_medium", "type", "status", "from_number", "to_number"],
}


def seed(apps, schema_editor):
    CRMGlobalSettings = apps.get_model("crm", "CRMGlobalSettings")
    for dt, fields in QUICK_FILTERS.items():
        if CRMGlobalSettings.objects.filter(dt=dt, type="Quick Filters").exists():
            continue
        CRMGlobalSettings.objects.create(
            name=uuid.uuid4().hex[:10], dt=dt, type="Quick Filters", json=json.dumps(fields),
        )


def unseed(apps, schema_editor):
    CRMGlobalSettings = apps.get_model("crm", "CRMGlobalSettings")
    CRMGlobalSettings.objects.filter(dt__in=QUICK_FILTERS.keys(), type="Quick Filters").delete()


class Migration(migrations.Migration):
    dependencies = [("crm", "0016_seed_contact_org_layouts")]
    operations = [migrations.RunPython(seed, unseed)]
