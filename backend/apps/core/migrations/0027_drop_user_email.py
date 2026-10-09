from apps.core.migration_utils import tolerant_extra_columns
from django.db import migrations


@tolerant_extra_columns
def copy_user_emails(apps, schema_editor):
    Old = apps.get_model("core", "UserEmail")
    New = apps.get_model("erpnext", "UserEmail")
    for row in Old.objects.select_related("user"):
        New.objects.get_or_create(
            name=f"ue{row.pk}",
            defaults={
                "parent": row.user.email,
                "parentfield": "user_emails",
                "parenttype": "User",
                "idx": row.idx + 1,
                "email_account": row.email_account,
                "email_id": row.email_id,
                "owner": "Administrator",
                "modified_by": "Administrator",
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0026_frappe_user_table'),
        ('erpnext', '0039_user_child_tables'),
    ]

    operations = [
        migrations.RunPython(copy_user_emails, migrations.RunPython.noop),
        migrations.DeleteModel(
            name='UserEmail',
        ),
    ]
