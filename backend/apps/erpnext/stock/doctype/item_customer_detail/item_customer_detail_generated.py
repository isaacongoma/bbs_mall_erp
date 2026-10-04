from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ItemCustomerDetailGenerated(FrappeChildModel):
    doctype = 'Item Customer Detail'
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_group = models.CharField(max_length=140, blank=True, null=True, default='')
    ref_code = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
