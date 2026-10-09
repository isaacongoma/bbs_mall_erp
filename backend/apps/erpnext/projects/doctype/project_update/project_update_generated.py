from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProjectUpdateGenerated(FrappeModel):
    doctype = 'Project Update'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    sent = models.SmallIntegerField(default=0)
    date = models.DateField(null=True, blank=True)
    time = FrappeTimeField(null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
