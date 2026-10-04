from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ShiftTypeGenerated(FrappeModel):
    doctype = 'Shift Type'
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    holiday_list = models.CharField(max_length=140, blank=True, null=True, default='')
    determine_check_in_and_check_out = models.CharField(max_length=140, blank=True, null=True, default='')
    working_hours_calculation_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    working_hours_threshold_for_half_day = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    working_hours_threshold_for_absent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    begin_check_in_before_shift_start_time = models.IntegerField(null=True, blank=True)
    late_entry_grace_period = models.IntegerField(null=True, blank=True)
    early_exit_grace_period = models.IntegerField(null=True, blank=True)
    allow_check_out_after_shift_end_time = models.IntegerField(null=True, blank=True)
    enable_auto_attendance = models.SmallIntegerField(default=0)
    process_attendance_after = models.DateField(null=True, blank=True)
    last_sync_of_checkin = models.DateTimeField(null=True, blank=True)
    mark_auto_attendance_on_holidays = models.SmallIntegerField(default=0)
    absent_buffer_days = models.IntegerField(null=True, blank=True)
    enable_late_entry_marking = models.SmallIntegerField(default=0)
    enable_early_exit_marking = models.SmallIntegerField(default=0)
    color = models.CharField(max_length=140, blank=True, null=True, default='Blue')
    auto_update_last_sync = models.SmallIntegerField(default=0)
    allow_overtime = models.SmallIntegerField(default=0)
    overtime_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
