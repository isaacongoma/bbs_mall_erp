from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MapreduceTaskGenerated(FrappeModel):
    doctype = 'MapReduce Task'
    master = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    map = models.CharField(max_length=140, blank=True, null=True, default='')
    reduce = models.CharField(max_length=140, blank=True, null=True, default='')
    map_partial = models.TextField(blank=True, null=True, default='')
    chunk = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
