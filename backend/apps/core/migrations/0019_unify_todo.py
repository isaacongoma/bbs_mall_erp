from django.db import migrations


def copy_todos(apps, schema_editor):
    Legacy = apps.get_model("core", "ToDo")
    Canonical = apps.get_model("erpnext", "Todo")
    User = apps.get_model("core", "User")
    emails = dict(User.objects.values_list("pk", "email"))
    existing = set(Canonical.objects.values_list("name", flat=True))
    rows = []
    for row in Legacy.objects.all().iterator():
        if row.name in existing:
            continue
        allocated = emails.get(row.allocated_to_id) or ""
        assigned_by = emails.get(row.assigned_by_id) or ""
        rows.append(
            Canonical(
                name=row.name,
                status=row.status,
                priority=row.priority,
                date=row.date,
                description=row.description,
                reference_type=row.reference_type,
                reference_name=row.reference_name,
                allocated_to=allocated,
                assigned_by=assigned_by,
                assignment_rule=row.assignment_rule_id or "",
                owner=assigned_by or allocated or "Administrator",
                modified_by=assigned_by or allocated or "Administrator",
                creation=row.creation,
                modified=row.modified,
            )
        )
    Canonical.objects.bulk_create(rows, batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0018_unify_email_account_template"),
        ("erpnext", "0022_dependenttask_tasktype"),
    ]

    operations = [
        migrations.RunPython(copy_todos, migrations.RunPython.noop),
        migrations.DeleteModel(name="ToDo"),
    ]
