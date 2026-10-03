from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("core", "0012_data_import")]

    operations = [
        migrations.AddField(
            model_name="user",
            name="email_signature",
            field=models.TextField(blank=True),
        ),
    ]
