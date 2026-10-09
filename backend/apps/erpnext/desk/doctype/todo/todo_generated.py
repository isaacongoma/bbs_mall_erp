from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TodoGenerated(FrappeModel):
    doctype = 'ToDo'
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')
    priority = models.CharField(max_length=140, blank=True, null=True, default='Medium')
    color = models.CharField(max_length=140, blank=True, null=True, default='')
    date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    reference_type = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    role = models.CharField(max_length=140, blank=True, null=True, default='')
    assigned_by = models.CharField(max_length=140, blank=True, null=True, default='')
    assigned_by_full_name = models.CharField(max_length=140, blank=True, null=True, default='')
    sender = models.CharField(max_length=140, blank=True, null=True, default='')
    assignment_rule = models.CharField(max_length=140, blank=True, null=True, default='')
    allocated_to = models.CharField(max_length=140, blank=True, null=True, default='')
    _seen = models.TextField(null=True, blank=True)

    class Meta:
        abstract = True
