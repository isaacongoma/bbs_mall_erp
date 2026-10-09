from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EtimsItemClassificationGenerated(FrappeModel):
    doctype = 'eTims Item Classification'
    itemclscd = models.CharField(max_length=140, blank=True, null=True, default='')
    itemclslvl = models.IntegerField(null=True, blank=True)
    itemclsnm = models.TextField(blank=True, null=True, default='')
    taxtycd = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
