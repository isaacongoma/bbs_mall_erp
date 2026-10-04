from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class MapreduceJobGenerated(FrappeModel):
    doctype = 'MapReduce Job'
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    map = models.CharField(max_length=140, blank=True, null=True, default='')
    reduce = models.CharField(max_length=140, blank=True, null=True, default='')
    data = models.TextField(blank=True, null=True, default='')
    result = models.TextField(blank=True, null=True, default='')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    document_name = models.CharField(max_length=140, blank=True, null=True, default='')
    callback = models.CharField(max_length=140, blank=True, null=True, default='')
    callback_executed = models.SmallIntegerField(default=0)
    job_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
