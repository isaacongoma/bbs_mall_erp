from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class EmployeeInternalWorkHistoryGenerated(FrappeChildModel):
    doctype = 'Employee Internal Work History'
    branch = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
