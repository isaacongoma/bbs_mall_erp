from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AssignmentRuleUserGenerated(FrappeChildModel):
    doctype = 'Assignment Rule User'
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    weight = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
