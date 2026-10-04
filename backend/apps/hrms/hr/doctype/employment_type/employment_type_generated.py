from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class EmploymentTypeGenerated(FrappeModel):
    doctype = 'Employment Type'
    employee_type_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
