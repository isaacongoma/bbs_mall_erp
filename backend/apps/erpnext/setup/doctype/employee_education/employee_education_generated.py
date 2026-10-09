from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeEducationGenerated(FrappeChildModel):
    doctype = 'Employee Education'
    school_univ = models.TextField(blank=True, null=True, default='')
    qualification = models.CharField(max_length=140, blank=True, null=True, default='')
    level = models.CharField(max_length=140, blank=True, null=True, default='')
    year_of_passing = models.IntegerField(null=True, blank=True)
    class_per = models.CharField(max_length=140, blank=True, null=True, default='')
    maj_opt_subj = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
