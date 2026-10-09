from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProductionPlanSalesOrderGenerated(FrappeChildModel):
    doctype = 'Production Plan Sales Order'
    sales_order = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_order_date = models.DateField(null=True, blank=True)
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
