from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0030_unify_currency"),
        ("core", "0015_unify_currency"),
    ]

    operations = [
        migrations.DeleteModel(name="Currency"),
    ]
