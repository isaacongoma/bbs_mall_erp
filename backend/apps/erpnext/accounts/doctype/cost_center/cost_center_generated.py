from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CostCenterGenerated(FrappeTreeModel):
    doctype = 'Cost Center'
    cost_center_name = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center_number = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    is_group = models.SmallIntegerField(default=0)
    lft = models.IntegerField(null=True, blank=True)
    rgt = models.IntegerField(null=True, blank=True)
    old_parent = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
