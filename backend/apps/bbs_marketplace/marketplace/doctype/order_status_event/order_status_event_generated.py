from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OrderStatusEventGenerated(FrappeChildModel):
    doctype = 'Order Status Event'
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    at = FrappeDateTimeField(null=True, blank=True)
    by = models.CharField(max_length=140, blank=True, null=True, default='')
    note = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
