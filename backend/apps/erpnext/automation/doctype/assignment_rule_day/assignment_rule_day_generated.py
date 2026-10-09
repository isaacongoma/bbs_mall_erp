from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AssignmentRuleDayGenerated(FrappeChildModel):
    doctype = 'Assignment Rule Day'
    day = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
