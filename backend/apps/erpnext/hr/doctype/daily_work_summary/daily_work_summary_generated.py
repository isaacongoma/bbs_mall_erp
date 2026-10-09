from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DailyWorkSummaryGenerated(FrappeModel):
    doctype = 'Daily Work Summary'
    daily_work_summary_group = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')
    email_sent_to = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
