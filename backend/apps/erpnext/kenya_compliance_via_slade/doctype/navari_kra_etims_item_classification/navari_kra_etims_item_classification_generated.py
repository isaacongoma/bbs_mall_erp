from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavariKraEtimsItemClassificationGenerated(FrappeModel):
    doctype = 'Navari KRA eTims Item Classification'
    itemclscd = models.CharField(max_length=140, blank=True, null=True, default='')
    slade_id = models.CharField(max_length=140, blank=True, null=True, default='')
    itemclslvl = models.IntegerField(null=True, blank=True)
    itemclsnm = models.TextField(blank=True, null=True, default='')
    taxtycd = models.CharField(max_length=140, blank=True, null=True, default='')
    useyn = models.SmallIntegerField(default=1)
    mjrtgyn = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
