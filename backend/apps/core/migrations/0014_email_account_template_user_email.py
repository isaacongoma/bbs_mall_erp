import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("core", "0013_user_email_signature")]

    operations = [
        migrations.CreateModel(
            name="EmailAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email_account_name", models.CharField(max_length=140, unique=True)),
                ("email_id", models.EmailField(max_length=254)),
                (
                    "service",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("GMail", "GMail"),
                            ("Outlook", "Outlook"),
                            ("Sendgrid", "Sendgrid"),
                            ("SparkPost", "SparkPost"),
                            ("Yahoo", "Yahoo"),
                            ("Yandex", "Yandex"),
                            ("Frappe Mail", "Frappe Mail"),
                        ],
                        max_length=20,
                    ),
                ),
                ("password", models.CharField(blank=True, max_length=255)),
                ("api_key", models.CharField(blank=True, max_length=255)),
                ("api_secret", models.CharField(blank=True, max_length=255)),
                ("frappe_mail_site", models.CharField(blank=True, max_length=255)),
                ("enable_incoming", models.BooleanField(default=False)),
                ("enable_outgoing", models.BooleanField(default=False)),
                ("default_incoming", models.BooleanField(default=False)),
                ("default_outgoing", models.BooleanField(default=False)),
                ("create_lead_from_incoming_email", models.BooleanField(default=False)),
                ("signature", models.TextField(blank=True)),
                ("creation", models.DateTimeField(auto_now_add=True)),
                ("modified", models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name": "Email Account", "db_table": "core_email_account", "ordering": ["-modified"]},
        ),
        migrations.CreateModel(
            name="EmailTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=140, unique=True)),
                ("enabled", models.BooleanField(default=False)),
                ("reference_doctype", models.CharField(blank=True, max_length=140)),
                ("subject", models.CharField(blank=True, max_length=255)),
                ("use_html", models.BooleanField(default=False)),
                ("response", models.TextField(blank=True)),
                ("response_html", models.TextField(blank=True)),
                ("creation", models.DateTimeField(auto_now_add=True)),
                ("modified", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        blank=True,
                        editable=False,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"verbose_name": "Email Template", "db_table": "core_email_template", "ordering": ["-modified"]},
        ),
        migrations.CreateModel(
            name="UserEmail",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("idx", models.PositiveIntegerField(default=0)),
                ("email_account", models.CharField(max_length=140)),
                ("email_id", models.EmailField(max_length=254)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_emails",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"verbose_name": "User Email", "db_table": "core_user_email", "ordering": ["idx", "id"]},
        ),
    ]
