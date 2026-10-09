from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class GoalGenerated(FrappeTreeModel):
    doctype = 'Goal'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date = models.DateField(null=True, blank=True)
    progress = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    description = models.TextField(blank=True, null=True, default='')
    lft = models.IntegerField(null=True, blank=True)
    rgt = models.IntegerField(null=True, blank=True)
    is_group = models.SmallIntegerField(default=0)
    old_parent = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_goal = models.CharField(max_length=140, blank=True, null=True, default='')
    kra = models.CharField(max_length=140, blank=True, null=True, default='')
    appraisal_cycle = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    end_date = models.DateField(null=True, blank=True)
    goal_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
