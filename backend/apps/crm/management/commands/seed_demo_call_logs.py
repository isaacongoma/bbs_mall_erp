import datetime

from django.core.management.base import BaseCommand

from apps.core.models import User
from apps.crm.doctype.call_log.call_log import CRMCallLog

DEMO_CALLS = [
    ("Incoming", "Ringing", 0, "0712345677", "0712345678"),
    ("Outgoing", "No Answer", 0, "+1 555 100 0002", "+1 555 000 5678"),
    ("Incoming", "Completed", 300, "+1 555 000 1234", "+1 555 100 0002"),
    ("Outgoing", "Completed", 420, "+1 555 100 0003", "+1 555 000 9012"),
    ("Outgoing", "Completed", 540, "+1 555 100 0002", "+1 555 000 5678"),
    ("Outgoing", "Completed", 720, "+1 555 100 0002", "+1 555 000 1234"),
    ("Incoming", "Completed", 600, "+1 555 000 3456", "+1 555 100 0002"),
]


class Command(BaseCommand):
    help = "Fill caller/receiver/duration on existing call logs and add demo call logs."

    def handle(self, *args, **options):
        users = list(User.objects.order_by("pk")[:3])
        if not users:
            self.stdout.write("No users found")
            return
        primary = users[0]

        for log in CRMCallLog.objects.all():
            changed = False
            if log.type == "Incoming" and not log.receiver_id:
                log.receiver = primary
                changed = True
            if log.type == "Outgoing" and not log.caller_id:
                log.caller = primary
                changed = True
            if log.duration is None:
                log.duration = datetime.timedelta(0)
                changed = True
            if changed:
                log.save()

        existing = set(CRMCallLog.objects.values_list("from_number", "to_number"))
        created = 0
        for index, (kind, status, seconds, from_number, to_number) in enumerate(DEMO_CALLS):
            if (from_number, to_number) in existing:
                continue
            user = users[index % len(users)]
            CRMCallLog.objects.create(
                type=kind,
                status=status,
                from_number=from_number,
                to_number=to_number,
                duration=datetime.timedelta(seconds=seconds),
                receiver=user if kind == "Incoming" else None,
                caller=user if kind == "Outgoing" else None,
            )
            created += 1
        self.stdout.write(f"Created {created} demo call logs")
