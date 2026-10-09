from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WarehouseGenerated(FrappeTreeModel):
    doctype = 'Warehouse'
    warehouse_name = models.CharField(max_length=140, blank=True, null=True, default='')
    is_group = models.SmallIntegerField(default=0)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    email_id = models.CharField(max_length=140, blank=True, null=True, default='')
    phone_no = models.CharField(max_length=140, blank=True, null=True, default='')
    mobile_no = models.CharField(max_length=140, blank=True, null=True, default='')
    address_line_1 = models.CharField(max_length=140, blank=True, null=True, default='')
    address_line_2 = models.CharField(max_length=140, blank=True, null=True, default='')
    city = models.CharField(max_length=140, blank=True, null=True, default='')
    state = models.CharField(max_length=140, blank=True, null=True, default='')
    pin = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    lft = models.IntegerField(null=True, blank=True)
    rgt = models.IntegerField(null=True, blank=True)
    old_parent = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse_type = models.CharField(max_length=140, blank=True, null=True, default='')
    default_in_transit_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    is_rejected_warehouse = models.SmallIntegerField(default=0)
    customer = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
