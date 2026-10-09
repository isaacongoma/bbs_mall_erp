from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalesPersonGenerated(FrappeTreeModel):
    doctype = 'Sales Person'
    sales_person_name = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_sales_person = models.CharField(max_length=140, blank=True, null=True, default='')
    commission_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_group = models.SmallIntegerField(default=0)
    enabled = models.SmallIntegerField(default=1)
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    lft = models.IntegerField(null=True, blank=True)
    rgt = models.IntegerField(null=True, blank=True)
    old_parent = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
