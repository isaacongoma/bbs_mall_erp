# Ported from crm/fcrm/doctype/crm_notification/crm_notification.json (frappe/crm, AGPL-3.0)
from django.conf import settings
from django.db import models

TYPE_CHOICES = [
    ("Mention", "Mention"),
    ("Task", "Task"),
    ("Assignment", "Assignment"),
    ("WhatsApp", "WhatsApp"),
    ("Automation", "Automation"),
]


class CRMNotification(models.Model):
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="Mention")
    comment = models.ForeignKey(
        "core.Comment", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    read = models.BooleanField(default=False)
    message = models.TextField(blank=True)
    reference_doctype = models.CharField(max_length=140, blank=True)
    reference_name = models.CharField(max_length=140, blank=True)
    notification_type_doctype = models.CharField(max_length=140, blank=True)
    notification_type_doc = models.CharField(max_length=140, blank=True)
    notification_text = models.TextField(blank=True)
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_notification"
        verbose_name = "CRM Notification"
        ordering = ["-creation"]

    def __str__(self):
        return f"Notification to {self.to_user_id}: {self.type}"
