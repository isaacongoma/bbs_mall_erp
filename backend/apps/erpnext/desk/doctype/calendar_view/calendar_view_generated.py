from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CalendarViewGenerated(FrappeModel):
    doctype = 'Calendar View'
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    subject_field = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date_field = models.CharField(max_length=140, blank=True, null=True, default='')
    end_date_field = models.CharField(max_length=140, blank=True, null=True, default='')
    all_day = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
