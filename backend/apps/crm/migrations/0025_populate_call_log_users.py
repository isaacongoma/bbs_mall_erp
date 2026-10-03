import datetime

from django.conf import settings
from django.db import migrations


def populate(apps, schema_editor):
    CRMCallLog = apps.get_model("crm", "CRMCallLog")
    User = apps.get_model("core", "User")
    user = User.objects.order_by("pk").first()
    if user is None:
        return
    for log in CRMCallLog.objects.all():
        changed = False
        if log.type == "Incoming" and not log.receiver_id:
            log.receiver_id = user.pk
            changed = True
        if log.type == "Outgoing" and not log.caller_id:
            log.caller_id = user.pk
            changed = True
        if log.duration is None:
            log.duration = datetime.timedelta(0)
            changed = True
        if changed:
            log.save(update_fields=["receiver", "caller", "duration"])


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("crm", "0024_crmservicelevelagreement_condition_json"),
    ]
    operations = [migrations.RunPython(populate, migrations.RunPython.noop)]
