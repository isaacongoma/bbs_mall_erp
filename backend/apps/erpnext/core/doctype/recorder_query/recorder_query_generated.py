from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class RecorderQueryGenerated(FrappeChildModel):
    doctype = 'Recorder Query'
    query = models.CharField(max_length=2, blank=True, null=True, default='')
    normalized_query = models.CharField(max_length=140, blank=True, null=True, default='')
    duration = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    exact_copies = models.IntegerField(null=True, blank=True)
    normalized_copies = models.IntegerField(null=True, blank=True)
    stack = models.TextField(blank=True, null=True, default='')
    explain_result = models.TextField(blank=True, null=True, default='')
    index = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
