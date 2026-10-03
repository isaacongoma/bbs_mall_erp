# Ported from crm/hooks.py's standard_dropdown_items + crm/install.py's
# add_standard_dropdown_items() (frappe/crm, AGPL-3.0) -- seeds the real CRM
# Dropdown Item child rows once so Settings > Home Actions has real,
# editable data from the start (previously a hardcoded fallback list with no
# backing rows at all -- edits there had nothing to save to).
import django.db.models.deletion
from django.db import migrations, models

STANDARD_DROPDOWN_ITEMS = [
    {"name1": "app_selector", "label": "Apps", "type": "Route", "route": "#", "is_standard": True},
    {"name1": "settings", "label": "Settings", "type": "Route", "icon": "settings", "route": "#", "is_standard": True},
    {"name1": "login_to_fc", "label": "Login to Frappe Cloud", "type": "Route", "route": "#", "is_standard": True},
    {"name1": "about", "label": "About", "type": "Route", "icon": "info", "route": "#", "is_standard": True},
    {"name1": "separator", "label": "", "type": "Separator", "is_standard": True},
    {"name1": "logout", "label": "Log out", "type": "Route", "icon": "log-out", "route": "#", "is_standard": True},
]


def seed(apps, schema_editor):
    FCRMSettings = apps.get_model("crm", "FCRMSettings")
    CRMDropdownItem = apps.get_model("crm", "CRMDropdownItem")

    settings, _ = FCRMSettings.objects.get_or_create(id=1)
    if CRMDropdownItem.objects.filter(parent_settings=settings).exists():
        return
    for idx, item in enumerate(STANDARD_DROPDOWN_ITEMS):
        CRMDropdownItem.objects.create(
            parent_settings=settings, idx=idx,
            label=item.get("label", ""), type=item["type"], route=item.get("route", ""),
            icon=item.get("icon", ""), is_standard=item.get("is_standard", False), name1=item["name1"],
        )


def unseed(apps, schema_editor):
    CRMDropdownItem = apps.get_model("crm", "CRMDropdownItem")
    CRMDropdownItem.objects.filter(name1__in=[i["name1"] for i in STANDARD_DROPDOWN_ITEMS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0022_alter_fcrmsettings_currency"),
    ]
    operations = [
        migrations.CreateModel(
            name="CRMDropdownItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("idx", models.PositiveIntegerField(default=0)),
                ("label", models.CharField(blank=True, max_length=140)),
                ("type", models.CharField(choices=[("Route", "Route"), ("Separator", "Separator")], default="Route", max_length=10)),
                ("route", models.CharField(blank=True, max_length=140)),
                ("hidden", models.BooleanField(default=False)),
                ("is_standard", models.BooleanField(default=False)),
                ("icon", models.TextField(blank=True)),
                ("open_in_new_window", models.BooleanField(default=False)),
                ("name1", models.CharField(blank=True, max_length=140)),
                ("parent_settings", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="dropdown_items_rows", to="crm.fcrmsettings")),
            ],
            options={
                "verbose_name": "CRM Dropdown Item",
                "db_table": "crm_dropdown_item",
                "ordering": ["idx"],
            },
        ),
        migrations.RunPython(seed, unseed),
    ]
