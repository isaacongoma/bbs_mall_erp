from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AppraiseeGenerated(FrappeChildModel):
    doctype = 'Appraisee'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    branch = models.CharField(max_length=140, blank=True, null=True, default='')
    appraisal_template = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
