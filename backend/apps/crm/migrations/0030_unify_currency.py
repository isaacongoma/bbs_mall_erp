import django.db.models.deletion
from django.db import migrations, models


def copy_currencies(apps, schema_editor):
    Legacy = apps.get_model("crm", "Currency")
    Canonical = apps.get_model("erpnext", "Currency")
    existing = set(Canonical.objects.values_list("name", flat=True))
    for row in Legacy.objects.all():
        if row.name in existing:
            continue
        Canonical.objects.create(
            name=row.name,
            currency_name=row.name,
            symbol=row.symbol,
            enabled=1 if row.enabled else 0,
            owner="Administrator",
            modified_by="Administrator",
        )


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0029_sales_hierarchy"),
        ("erpnext", "0022_dependenttask_tasktype"),
    ]

    operations = [
        migrations.RunPython(copy_currencies, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="crmorganization",
            name="currency",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="erpnext.currency"),
        ),
        migrations.AlterField(
            model_name="crmdeal",
            name="currency",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="erpnext.currency"),
        ),
    ]
