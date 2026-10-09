from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeaveTypeGenerated(FrappeModel):
    doctype = 'Leave Type'
    leave_type_name = models.CharField(max_length=140, blank=True, null=True, default='')
    max_leaves_allowed = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    applicable_after = models.IntegerField(null=True, blank=True)
    max_continuous_days_allowed = models.IntegerField(null=True, blank=True)
    is_carry_forward = models.SmallIntegerField(default=0)
    is_lwp = models.SmallIntegerField(default=0)
    is_optional_leave = models.SmallIntegerField(default=0)
    allow_negative = models.SmallIntegerField(default=0)
    include_holiday = models.SmallIntegerField(default=0)
    is_compensatory = models.SmallIntegerField(default=0)
    expire_carry_forwarded_leaves_after_days = models.IntegerField(null=True, blank=True)
    allow_encashment = models.SmallIntegerField(default=0)
    earning_component = models.CharField(max_length=140, blank=True, null=True, default='')
    is_earned_leave = models.SmallIntegerField(default=0)
    earned_leave_frequency = models.CharField(max_length=140, blank=True, null=True, default='')
    rounding = models.CharField(max_length=140, blank=True, null=True, default='')
    maximum_carry_forwarded_leaves = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_ppl = models.SmallIntegerField(default=0)
    fraction_of_daily_salary_per_leave = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    allow_over_allocation = models.SmallIntegerField(default=0)
    allocate_on_day = models.CharField(max_length=140, blank=True, null=True, default='Last Day')
    max_encashable_leaves = models.IntegerField(null=True, blank=True)
    non_encashable_leaves = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
