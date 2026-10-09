from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavariEtimsUomCategoryGenerated(FrappeModel):
    doctype = 'Navari eTims UOM Category'
    category_name = models.CharField(max_length=140, blank=True, null=True, default='')
    slade_id = models.CharField(max_length=140, blank=True, null=True, default='')
    measure_type = models.CharField(max_length=140, blank=True, null=True, default='unit')
    active = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
