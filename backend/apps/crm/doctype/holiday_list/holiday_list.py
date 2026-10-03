# Ported from crm/fcrm/doctype/crm_holiday_list/crm_holiday_list.py (frappe/crm, AGPL-3.0)
from django.core.exceptions import ValidationError
from django.db import models


class CRMHolidayList(models.Model):
    name = models.CharField(max_length=140, primary_key=True)  # holiday_list_name (autoname: field:holiday_list_name)
    from_date = models.DateField()
    to_date = models.DateField()
    total_holidays = models.IntegerField(default=0)
    weekly_off = models.CharField(max_length=10, blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_holiday_list"
        verbose_name = "CRM Holiday List"

    def __str__(self):
        return self.name

    def validate_days(self):
        if self.from_date > self.to_date:
            raise ValidationError("To Date cannot be before From Date")
        for row in self.holidays.all():
            if not (self.from_date <= row.date <= self.to_date):
                raise ValidationError(
                    f"The holiday on {row.date} is not between From Date and To Date"
                )

    def save(self, *args, **kwargs):
        self.validate_days()
        super().save(*args, **kwargs)

    def recalc_total_holidays(self):
        """Called by the view after replacing the `holidays` child rows --
        mirrors the real doctype's validate() hook, which runs after child
        rows are already attached to the in-memory document; here the rows
        are written in a separate step, so this is a separate call instead."""
        type(self).objects.filter(pk=self.pk).update(total_holidays=self.holidays.count())

    def get_weekly_off_date_list(self, start_date, end_date):
        """Every occurrence of self.weekly_off's weekday between start_date and
        end_date (inclusive) that isn't already a row in self.holidays."""
        import calendar
        from datetime import timedelta

        from dateutil import relativedelta

        existing = {row.date for row in self.holidays.all()}
        weekday = getattr(calendar, self.weekly_off.upper())
        reference_date = start_date + relativedelta.relativedelta(weekday=weekday)

        dates = []
        while reference_date <= end_date:
            if reference_date not in existing:
                dates.append(reference_date)
            reference_date += timedelta(days=7)
        return dates

    def get_weekly_off_dates(self):
        if not self.weekly_off:
            raise ValidationError("Please select weekly off day")
        return self.get_weekly_off_date_list(self.from_date, self.to_date)
