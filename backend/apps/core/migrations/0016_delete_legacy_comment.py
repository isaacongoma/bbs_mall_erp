from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0015_unify_currency"),
        ("crm", "0032_unify_comment"),
    ]

    operations = [
        migrations.DeleteModel(name="Comment"),
    ]
