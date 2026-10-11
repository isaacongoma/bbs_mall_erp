from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('frappe', '0012_sessions_table')]

    operations = [
        migrations.AlterField(
            model_name='singles',
            name='value',
            field=models.TextField(blank=True, default='', null=True),
        ),
    ]
