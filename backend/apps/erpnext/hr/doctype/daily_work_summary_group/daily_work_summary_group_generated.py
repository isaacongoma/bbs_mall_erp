from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DailyWorkSummaryGroupGenerated(FrappeModel):
    doctype = 'Daily Work Summary Group'
    enabled = models.SmallIntegerField(default=1)
    send_emails_at = models.CharField(max_length=140, blank=True, null=True, default='')
    holiday_list = models.CharField(max_length=140, blank=True, null=True, default='')
    subject = models.CharField(max_length=140, blank=True, null=True, default='What did you work on today?')
    message = models.TextField(blank=True, null=True, default='<p>Please share what did you do today. If you reply by midnight, your response will be recorded!</p>')

    class Meta:
        abstract = True
