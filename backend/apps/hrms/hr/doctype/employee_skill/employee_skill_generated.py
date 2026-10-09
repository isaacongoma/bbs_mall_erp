from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeSkillGenerated(FrappeChildModel):
    doctype = 'Employee Skill'
    skill = models.CharField(max_length=140, blank=True, null=True, default='')
    proficiency = models.CharField(max_length=140, blank=True, null=True, default='')
    evaluation_date = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
