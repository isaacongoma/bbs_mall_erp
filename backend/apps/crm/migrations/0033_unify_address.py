import django.db.models.deletion
from apps.core.migration_utils import tolerant_extra_columns
from django.db import migrations, models


@tolerant_extra_columns
def copy_addresses(apps, schema_editor):
    Legacy = apps.get_model("core", "Address")
    Canonical = apps.get_model("erpnext", "Address")
    existing = set(Canonical.objects.values_list("name", flat=True))
    rows = []
    for row in Legacy.objects.all().iterator():
        if row.name in existing:
            continue
        rows.append(
            Canonical(
                name=row.name,
                address_title=row.address_title,
                address_type=row.address_type,
                address_line1=row.address_line1,
                address_line2=row.address_line2,
                city=row.city,
                state=row.state,
                country=row.country,
                pincode=row.pincode,
                owner="Administrator",
                modified_by="Administrator",
            )
        )
    Canonical.objects.bulk_create(rows, batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0032_unify_comment"),
        ("core", "0019_unify_todo"),
        ("erpnext", "0022_dependenttask_tasktype"),
    ]

    operations = [
        migrations.RunPython(copy_addresses, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="crmorganization",
            name="address",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="erpnext.address"),
        ),
    ]
