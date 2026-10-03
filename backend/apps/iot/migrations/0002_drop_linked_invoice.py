from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("iot", "0001_initial")]

    operations = [
        migrations.RunSQL(
            "ALTER TABLE \"tabParkingSession\" DROP COLUMN IF EXISTS linked_invoice_id",
            migrations.RunSQL.noop,
        )
    ]
