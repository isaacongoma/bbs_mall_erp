import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0019_unify_todo"),
        ("crm", "0033_unify_address"),
    ]

    operations = [
        migrations.AlterField(
            model_name="contact",
            name="address",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="erpnext.address"),
        ),
        migrations.DeleteModel(name="Address"),
    ]
