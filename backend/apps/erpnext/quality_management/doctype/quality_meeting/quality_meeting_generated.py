from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityMeetingGenerated(FrappeModel):
    doctype = 'Quality Meeting'
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')

    class Meta:
        abstract = True
