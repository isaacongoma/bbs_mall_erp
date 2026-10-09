from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeaveApplicationGenerated(FrappeModel):
    doctype = 'Leave Application'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_type = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_balance = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    half_day = models.SmallIntegerField(default=0)
    half_day_date = models.DateField(null=True, blank=True)
    total_leave_days = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    leave_approver = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_approver_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')
    posting_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    follow_via_email = models.SmallIntegerField(default=1)
    salary_slip = models.CharField(max_length=140, blank=True, null=True, default='')
    letter_head = models.CharField(max_length=140, blank=True, null=True, default='')
    color = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
