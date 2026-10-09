from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ItemLeadTimeSupplierGenerated(FrappeChildModel):
    doctype = 'Item Lead Time Supplier'
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    purchase_time = models.IntegerField(null=True, blank=True)
    buffer_time = models.IntegerField(null=True, blank=True)
    is_default = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
