import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("crm", "0027_telephony_settings_fields")]

    operations = [
        migrations.CreateModel(
            name="FacebookPage",
            fields=[
                ("name", models.CharField(max_length=140, primary_key=True, serialize=False)),
                ("page_name", models.CharField(blank=True, max_length=255)),
                ("access_token", models.TextField(blank=True)),
            ],
            options={"verbose_name": "Facebook Page", "db_table": "crm_facebook_page"},
        ),
        migrations.CreateModel(
            name="FacebookLeadForm",
            fields=[
                ("name", models.CharField(max_length=140, primary_key=True, serialize=False)),
                ("lead_form_name", models.CharField(blank=True, max_length=255)),
                (
                    "page",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="lead_forms", to="crm.facebookpage"
                    ),
                ),
            ],
            options={"verbose_name": "Facebook Lead Form", "db_table": "crm_facebook_lead_form"},
        ),
        migrations.CreateModel(
            name="FacebookLeadFormQuestion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("idx", models.PositiveIntegerField(default=0)),
                ("key", models.CharField(max_length=140)),
                ("label", models.CharField(blank=True, max_length=255)),
                ("type", models.CharField(blank=True, max_length=60)),
                ("mapped_to_crm_field", models.CharField(blank=True, max_length=140)),
                (
                    "parent",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="questions", to="crm.facebookleadform"
                    ),
                ),
            ],
            options={
                "verbose_name": "Facebook Lead Form Question",
                "db_table": "crm_facebook_lead_form_question",
                "ordering": ["idx", "id"],
            },
        ),
        migrations.CreateModel(
            name="LeadSyncSource",
            fields=[
                ("name", models.CharField(max_length=140, primary_key=True, serialize=False)),
                ("type", models.CharField(choices=[("Facebook", "Facebook")], default="Facebook", max_length=20)),
                ("access_token", models.TextField(blank=True)),
                ("enabled", models.BooleanField(default=True)),
                ("last_synced_at", models.DateTimeField(blank=True, null=True)),
                (
                    "background_sync_frequency",
                    models.CharField(
                        choices=[("Hourly", "Hourly"), ("Daily", "Daily"), ("Weekly", "Weekly")],
                        default="Hourly",
                        max_length=10,
                    ),
                ),
                ("creation", models.DateTimeField(auto_now_add=True)),
                ("modified", models.DateTimeField(auto_now=True)),
                (
                    "facebook_lead_form",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="crm.facebookleadform",
                    ),
                ),
                (
                    "facebook_page",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="crm.facebookpage",
                    ),
                ),
            ],
            options={"verbose_name": "Lead Sync Source", "db_table": "crm_lead_sync_source", "ordering": ["-modified"]},
        ),
        migrations.CreateModel(
            name="FailedLeadSyncLog",
            fields=[
                ("name", models.CharField(editable=False, max_length=140, primary_key=True, serialize=False)),
                (
                    "type",
                    models.CharField(
                        choices=[("Mapping Failed", "Mapping Failed"), ("Sync Failed", "Sync Failed"), ("Synced", "Synced")],
                        default="Sync Failed",
                        max_length=20,
                    ),
                ),
                ("lead_data", models.TextField(blank=True)),
                ("traceback", models.TextField(blank=True)),
                ("creation", models.DateTimeField(auto_now_add=True)),
                (
                    "source",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="failed_logs", to="crm.leadsyncsource"
                    ),
                ),
            ],
            options={"verbose_name": "Failed Lead Sync Log", "db_table": "crm_failed_lead_sync_log", "ordering": ["-creation"]},
        ),
    ]
