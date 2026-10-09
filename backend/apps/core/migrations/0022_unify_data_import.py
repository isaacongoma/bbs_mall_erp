from apps.core.migration_utils import tolerant_extra_columns
from django.db import migrations


@tolerant_extra_columns
def copy_imports(apps, schema_editor):
    LegacyImport = apps.get_model("core", "DataImport")
    LegacyLog = apps.get_model("core", "DataImportLog")
    Import = apps.get_model("erpnext", "DataImport")
    Log = apps.get_model("erpnext", "DataImportLog")
    existing = set(Import.objects.values_list("name", flat=True))
    for row in LegacyImport.objects.all().iterator():
        if row.name in existing:
            continue
        Import.objects.create(
            name=row.name,
            reference_doctype=row.reference_doctype,
            import_type=row.import_type,
            status=row.status,
            import_file=row.import_file,
            google_sheets_url=row.google_sheets_url,
            template_options=row.template_options,
            mute_emails=1 if row.mute_emails else 0,
            owner="Administrator",
            modified_by="Administrator",
            creation=row.creation,
            modified=row.modified,
        )
    for log in LegacyLog.objects.all().iterator():
        Log.objects.create(
            name=f"legacy-{log.pk}",
            data_import=log.data_import_id,
            log_index=log.log_index,
            success=1 if log.success else 0,
            docname=log.docname,
            messages=log.messages,
            exception=log.exception,
            row_indexes=log.row_indexes,
            owner="Administrator",
            modified_by="Administrator",
            creation=log.creation,
            modified=log.creation,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0021_delete_legacy_contact"),
        ("erpnext", "0025_data_import_log"),
    ]

    operations = [
        migrations.RunPython(copy_imports, migrations.RunPython.noop),
        migrations.DeleteModel(name="DataImportLog"),
        migrations.DeleteModel(name="DataImport"),
    ]
