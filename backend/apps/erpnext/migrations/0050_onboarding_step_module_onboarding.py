from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('erpnext', '0049_restore_onboarding_is_optional'),
    ]

    operations = [
        migrations.AddField(
            model_name='onboardingstep',
            name='module_onboarding',
            field=models.CharField(blank=True, default='', max_length=140, null=True),
        ),
    ]
