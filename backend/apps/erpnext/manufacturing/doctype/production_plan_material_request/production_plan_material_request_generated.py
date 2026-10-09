from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProductionPlanMaterialRequestGenerated(FrappeChildModel):
    doctype = 'Production Plan Material Request'
    material_request = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request_date = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
