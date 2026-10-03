import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("crm", "0025_populate_call_log_users"),
    ]

    operations = [
        migrations.CreateModel(
            name="CRMInvitation",
            fields=[
                ("name", models.CharField(editable=False, max_length=140, primary_key=True, serialize=False)),
                ("email", models.EmailField(max_length=254)),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("System Manager", "System Manager"),
                            ("Sales Manager", "Sales Manager"),
                            ("Sales User", "Sales User"),
                        ],
                        default="Sales User",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("Pending", "Pending"), ("Accepted", "Accepted"), ("Expired", "Expired")],
                        default="Pending",
                        max_length=10,
                    ),
                ),
                ("key", models.CharField(blank=True, max_length=64)),
                ("creation", models.DateTimeField(auto_now_add=True)),
                ("modified", models.DateTimeField(auto_now=True)),
                (
                    "invited_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"verbose_name": "CRM Invitation", "db_table": "crm_invitation", "ordering": ["-creation"]},
        ),
    ]
