from django.db import migrations, models

GIN_INDEX = """CREATE INDEX IF NOT EXISTS "__global_search_fts"
ON "__global_search" USING gin (to_tsvector('english', coalesce(content, '')))"""


class Migration(migrations.Migration):

    dependencies = [
        ('frappe', '0007_user_view'),
    ]

    operations = [
        migrations.CreateModel(
            name='GlobalSearch',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('doctype', models.CharField(max_length=100)),
                ('name', models.CharField(max_length=140)),
                ('title', models.CharField(blank=True, max_length=140, null=True)),
                ('content', models.TextField(blank=True, null=True)),
                ('route', models.CharField(blank=True, max_length=140, null=True)),
                ('published', models.IntegerField(default=0)),
            ],
            options={
                'db_table': '__global_search',
            },
        ),
        migrations.AddConstraint(
            model_name='globalsearch',
            constraint=models.UniqueConstraint(fields=('doctype', 'name'), name='uniq_global_search_doctype_name'),
        ),
        migrations.RunSQL(sql=GIN_INDEX, reverse_sql='DROP INDEX IF EXISTS "__global_search_fts"'),
    ]
