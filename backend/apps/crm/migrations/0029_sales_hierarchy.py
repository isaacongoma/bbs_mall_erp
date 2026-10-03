import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("crm", "0028_lead_syncing")]

    operations = [
        migrations.AddField(
            model_name="fcrmsettings",
            name="enable_sales_hierarchy",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="SalesHierarchy",
            fields=[
                ("name", models.CharField(editable=False, max_length=140, primary_key=True, serialize=False)),
                ("is_group", models.BooleanField(default=False)),
                ("lft", models.IntegerField(default=0, editable=False)),
                ("rgt", models.IntegerField(default=0, editable=False)),
                (
                    "reports_to",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="children",
                        to="crm.saleshierarchy",
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE, related_name="+", to=settings.AUTH_USER_MODEL
                    ),
                ),
            ],
            options={"verbose_name": "CRM Sales Hierarchy", "db_table": "crm_sales_hierarchy", "ordering": ["lft"]},
        ),
    ]
