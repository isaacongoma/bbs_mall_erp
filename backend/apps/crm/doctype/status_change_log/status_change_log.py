# Ported from crm/fcrm/doctype/crm_status_change_log/{crm_status_change_log.json,.py} (frappe/crm, AGPL-3.0)
# Child table -- appended to a Lead/Deal each time its status changes.
from datetime import timedelta

from django.db import models
from django.utils import timezone

from apps.core.middleware import get_current_user


class CRMStatusChangeLog(models.Model):
    parent_lead = models.ForeignKey(
        "crm.CRMLead", on_delete=models.CASCADE, related_name="status_change_log", null=True, blank=True
    )
    parent_deal = models.ForeignKey(
        "crm.CRMDeal", on_delete=models.CASCADE, related_name="status_change_log", null=True, blank=True
    )
    idx = models.PositiveIntegerField(default=0)

    from_status = models.CharField(max_length=140, blank=True)
    from_type = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=140, blank=True)
    to_type = models.CharField(max_length=20, blank=True)
    from_date = models.DateTimeField(null=True, blank=True)
    to_date = models.DateTimeField(null=True, blank=True)
    duration = models.DurationField(null=True, blank=True)
    log_owner = models.ForeignKey(
        "core.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        app_label = "crm"
        db_table = "crm_status_change_log"
        verbose_name = "CRM Status Change Log"
        ordering = ["idx"]


def add_status_change_log(doc, status_model, previous_status_id, is_new):
    """Call once doc.status_id already holds the new value. previous_status_id
    is the value it had before this save (None for a new record)."""
    user = get_current_user()
    log_owner_id = user.pk if user and getattr(user, "is_authenticated", False) else None

    def status_type(status_id):
        if not status_id:
            return ""
        return status_model.objects.filter(name=status_id).values_list("type", flat=True).first() or ""

    if not is_new:
        last_log = doc.status_change_log.order_by("idx").last()
        now = timezone.now()
        if not last_log and previous_status_id:
            # No history yet: synthesize the opening entry and close it in the same step.
            from_date = now - timedelta(minutes=1)
            doc.buffer_child_row(
                "status_change_log",
                from_status=previous_status_id,
                from_type=status_type(previous_status_id),
                to_status=doc.status_id,
                to_type=status_type(doc.status_id),
                from_date=from_date,
                to_date=now,
                duration=now - from_date,
                log_owner_id=log_owner_id,
            )
        elif last_log:
            last_log.to_status = doc.status_id
            last_log.to_type = status_type(doc.status_id)
            last_log.to_date = now
            last_log.log_owner_id = log_owner_id
            if last_log.from_date:
                last_log.duration = last_log.to_date - last_log.from_date
            last_log.save()

    doc.buffer_child_row(
        "status_change_log",
        from_status=doc.status_id,
        from_type=status_type(doc.status_id),
        from_date=timezone.now(),
        log_owner_id=log_owner_id,
    )
