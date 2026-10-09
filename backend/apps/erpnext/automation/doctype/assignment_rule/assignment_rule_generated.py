from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AssignmentRuleGenerated(FrappeModel):
    doctype = 'Assignment Rule'
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    priority = models.IntegerField(null=True, blank=True)
    disabled = models.SmallIntegerField(default=0)
    description = models.TextField(blank=True, null=True, default='Automatic Assignment')
    assign_condition = models.TextField(blank=True, null=True, default='')
    unassign_condition = models.TextField(blank=True, null=True, default='')
    rule = models.CharField(max_length=140, blank=True, null=True, default='')
    last_user = models.CharField(max_length=140, blank=True, null=True, default='')
    close_condition = models.TextField(blank=True, null=True, default='')
    due_date_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    field = models.CharField(max_length=140, blank=True, null=True, default='')
    current_index = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
