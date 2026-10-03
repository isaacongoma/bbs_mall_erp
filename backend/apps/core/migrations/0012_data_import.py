from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0011_web_form"),
    ]

    operations = [
        migrations.CreateModel(
            name="DataImport",
            fields=[
                ("name", models.CharField(editable=False, max_length=140, primary_key=True, serialize=False)),
                ("reference_doctype", models.CharField(max_length=140)),
                (
                    "import_type",
                    models.CharField(
                        choices=[
                            ("Insert New Records", "Insert New Records"),
                            ("Update Existing Records", "Update Existing Records"),
                        ],
                        default="Insert New Records",
                        max_length=30,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("Pending", "Pending"),
                            ("Success", "Success"),
                            ("Partial Success", "Partial Success"),
                            ("Error", "Error"),
                            ("Timed Out", "Timed Out"),
                        ],
                        default="Pending",
                        max_length=20,
                    ),
                ),
                ("import_file", models.TextField(blank=True)),
                ("google_sheets_url", models.TextField(blank=True)),
                ("template_options", models.TextField(blank=True)),
                ("mute_emails", models.BooleanField(default=True)),
                ("creation", models.DateTimeField(auto_now_add=True)),
                ("modified", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Data Import",
                "db_table": "data_import",
                "ordering": ["-modified"],
            },
        ),
        migrations.CreateModel(
            name="DataImportLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("log_index", models.PositiveIntegerField(default=0)),
                ("success", models.BooleanField(default=False)),
                ("docname", models.CharField(blank=True, max_length=140)),
                ("messages", models.TextField(blank=True)),
                ("exception", models.TextField(blank=True)),
                ("row_indexes", models.TextField(blank=True)),
                ("creation", models.DateTimeField(auto_now_add=True)),
                (
                    "data_import",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="logs", to="core.dataimport"
                    ),
                ),
            ],
            options={
                "verbose_name": "Data Import Log",
                "db_table": "data_import_log",
                "ordering": ["log_index"],
            },
        ),
    ]
