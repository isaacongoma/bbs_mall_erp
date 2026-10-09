from apps.core.migration_utils import tolerant_extra_columns
from django.db import migrations


@tolerant_extra_columns
def copy_docshares(apps, schema_editor):
    OldShare = apps.get_model("core", "DocShare")
    NewShare = apps.get_model("erpnext", "Docshare")
    User = apps.get_model("core", "User")
    emails = {user.pk: user.email for user in User.objects.all()}
    for row in OldShare.objects.all():
        user = emails.get(row.user_id)
        if not user:
            continue
        NewShare.objects.get_or_create(
            name=row.name,
            defaults={
                "user": user,
                "share_doctype": row.share_doctype,
                "share_name": row.share_name,
                "read": int(bool(row.read)),
                "write": int(bool(row.write)),
                "share": int(bool(row.share)),
                "submit": int(bool(row.submit)),
                "everyone": int(bool(row.everyone)),
                "notify_by_email": int(bool(row.notify_by_email)),
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0024_gender_salutation'),
        ('erpnext', '0044_frappe_docshare'),
    ]

    operations = [
        migrations.RunPython(copy_docshares, migrations.RunPython.noop),
        migrations.DeleteModel(
            name='DocShare',
        ),
    ]
