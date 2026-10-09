from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeaveBlockListGenerated(FrappeModel):
    doctype = 'Leave Block List'
    leave_block_list_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    applies_to_all_departments = models.SmallIntegerField(default=0)
    leave_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
