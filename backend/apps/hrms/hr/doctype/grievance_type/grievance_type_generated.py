from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class GrievanceTypeGenerated(FrappeModel):
    doctype = 'Grievance Type'
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
