from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0020_delete_legacy_address"),
        ("crm", "0034_unify_contact"),
    ]

    operations = [
        migrations.DeleteModel(name="ContactEmail"),
        migrations.DeleteModel(name="ContactPhone"),
        migrations.DeleteModel(name="Contact"),
    ]
