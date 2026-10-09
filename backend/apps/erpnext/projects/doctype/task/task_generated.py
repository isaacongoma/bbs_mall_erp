from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TaskGenerated(FrappeTreeModel):
    doctype = 'Task'
    subject = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    issue = models.CharField(max_length=140, blank=True, null=True, default='')
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    is_group = models.SmallIntegerField(default=0)
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    priority = models.CharField(max_length=140, blank=True, null=True, default='')
    color = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_task = models.CharField(max_length=140, blank=True, null=True, default='')
    exp_start_date = FrappeDateTimeField(null=True, blank=True)
    expected_time = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    task_weight = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    exp_end_date = FrappeDateTimeField(null=True, blank=True)
    progress = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_milestone = models.SmallIntegerField(default=0)
    description = models.TextField(blank=True, null=True, default='')
    depends_on_tasks = models.TextField(blank=True, null=True, default='')
    act_start_date = models.DateField(null=True, blank=True)
    actual_time = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    act_end_date = models.DateField(null=True, blank=True)
    total_costing_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_billing_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    review_date = models.DateField(null=True, blank=True)
    closing_date = models.DateField(null=True, blank=True)
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    lft = models.IntegerField(null=True, blank=True)
    rgt = models.IntegerField(null=True, blank=True)
    old_parent = models.CharField(max_length=140, blank=True, null=True, default='')
    completed_by = models.CharField(max_length=140, blank=True, null=True, default='')
    is_template = models.SmallIntegerField(default=0)
    start = models.IntegerField(null=True, blank=True)
    duration = models.IntegerField(null=True, blank=True)
    completed_on = models.DateField(null=True, blank=True)
    template_task = models.CharField(max_length=140, blank=True, null=True, default='')
    _seen = models.TextField(null=True, blank=True)

    class Meta:
        abstract = True
