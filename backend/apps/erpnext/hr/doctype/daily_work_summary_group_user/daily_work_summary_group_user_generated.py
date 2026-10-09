from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DailyWorkSummaryGroupUserGenerated(FrappeChildModel):
    doctype = 'Daily Work Summary Group User'
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    email = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
