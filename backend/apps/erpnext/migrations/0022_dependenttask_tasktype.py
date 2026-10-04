from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('erpnext', '0021_alter_accesslog_columns_alter_accesslog_export_from_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='DependentTask',
            fields=[
                ('name', models.CharField(max_length=140, primary_key=True, serialize=False)),
                ('owner', models.CharField(blank=True, default='', max_length=140)),
                ('creation', models.DateTimeField(blank=True, null=True)),
                ('modified', models.DateTimeField(blank=True, null=True)),
                ('modified_by', models.CharField(blank=True, default='', max_length=140)),
                ('docstatus', models.SmallIntegerField(default=0)),
                ('idx', models.IntegerField(default=0)),
                ('parent', models.CharField(blank=True, default='', max_length=140)),
                ('parentfield', models.CharField(blank=True, default='', max_length=140)),
                ('parenttype', models.CharField(blank=True, default='', max_length=140)),
                ('task', models.CharField(blank=True, default='', max_length=140, null=True)),
            ],
            options={
                'verbose_name': 'Dependent Task',
                'db_table': 'tabDependent Task',
                'ordering': ['-creation'],
            },
        ),
        migrations.CreateModel(
            name='TaskType',
            fields=[
                ('name', models.CharField(max_length=140, primary_key=True, serialize=False)),
                ('owner', models.CharField(blank=True, default='', max_length=140)),
                ('creation', models.DateTimeField(blank=True, null=True)),
                ('modified', models.DateTimeField(blank=True, null=True)),
                ('modified_by', models.CharField(blank=True, default='', max_length=140)),
                ('docstatus', models.SmallIntegerField(default=0)),
                ('idx', models.IntegerField(default=0)),
                ('weight', models.DecimalField(blank=True, decimal_places=9, max_digits=21, null=True)),
                ('description', models.TextField(blank=True, default='', null=True)),
            ],
            options={
                'verbose_name': 'Task Type',
                'db_table': 'tabTask Type',
                'ordering': ['creation'],
            },
        ),
    ]
