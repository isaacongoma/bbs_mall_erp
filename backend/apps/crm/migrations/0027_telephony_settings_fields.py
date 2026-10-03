from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("crm", "0026_crminvitation")]

    operations = [
        migrations.AlterField(
            model_name="crmtelephonyagent",
            name="mobile_no",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AlterField(
            model_name="crmtwiliosettings",
            name="twilio_apps",
            field=models.TextField(blank=True),
        ),
    ]
