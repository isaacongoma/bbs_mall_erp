import django.db.models.deletion
from apps.core.migration_utils import tolerant_extra_columns
from django.db import migrations, models


@tolerant_extra_columns
def copy_comments(apps, schema_editor):
    Legacy = apps.get_model("core", "Comment")
    Canonical = apps.get_model("erpnext", "Comment")
    User = apps.get_model("core", "User")
    emails = dict(User.objects.values_list("pk", "email"))
    existing = set(Canonical.objects.values_list("name", flat=True))
    rows = []
    for row in Legacy.objects.all().iterator():
        name = str(row.pk)
        if name in existing:
            continue
        email = emails.get(row.owner_id) or ""
        rows.append(
            Canonical(
                name=name,
                comment_type="Comment",
                comment_email=email,
                comment_by=email,
                reference_doctype=row.reference_doctype,
                reference_name=row.reference_name,
                content=row.content,
                owner=email,
                modified_by=email,
                creation=row.creation,
                modified=row.modified,
            )
        )
    Canonical.objects.bulk_create(rows, batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0031_delete_legacy_currency"),
        ("core", "0015_unify_currency"),
        ("erpnext", "0022_dependenttask_tasktype"),
    ]

    operations = [
        migrations.RunPython(copy_comments, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="crmnotification",
            name="comment",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="erpnext.comment"),
        ),
    ]
