from django.db import migrations


def copy_files(apps, schema_editor):
    Legacy = apps.get_model("core", "FileAttachment")
    Canonical = apps.get_model("erpnext", "File")
    User = apps.get_model("core", "User")
    emails = dict(User.objects.values_list("pk", "email"))
    existing = set(Canonical.objects.values_list("name", flat=True))
    rows = []
    for row in Legacy.objects.all().iterator():
        name = str(row.pk)
        if name in existing:
            continue
        try:
            url = row.file.url if row.file else ""
            size = row.file.size if row.file else 0
        except (OSError, ValueError):
            url = f"/media/{row.file.name}" if row.file else ""
            size = 0
        email = emails.get(row.owner_id) or ""
        rows.append(
            Canonical(
                name=name,
                file_name=row.file_name,
                file_url=url,
                file_size=size,
                is_private=1 if row.is_private else 0,
                folder=row.folder,
                attached_to_doctype=row.attached_to_doctype,
                attached_to_name=row.attached_to_name,
                attached_to_field=row.attached_to_field,
                owner=email,
                modified_by=email,
                creation=row.creation,
                modified=row.creation,
            )
        )
    Canonical.objects.bulk_create(rows, batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0016_delete_legacy_comment"),
        ("erpnext", "0022_dependenttask_tasktype"),
    ]

    operations = [
        migrations.RunPython(copy_files, migrations.RunPython.noop),
        migrations.DeleteModel(name="FileAttachment"),
    ]
