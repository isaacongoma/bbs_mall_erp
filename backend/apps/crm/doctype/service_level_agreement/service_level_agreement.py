# Ported from crm/fcrm/doctype/crm_service_level_agreement/crm_service_level_agreement.py
# (frappe/crm, AGPL-3.0)
from datetime import date, datetime, timedelta

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.crm.doctype.service_level_agreement.condition_eval import UnsafeConditionError, evaluate_condition

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

APPLY_ON_CHOICES = [("CRM Lead", "CRM Lead"), ("CRM Deal", "CRM Deal")]
SLA_STATUS_CHOICES = [
    ("", ""),
    ("First Response Due", "First Response Due"),
    ("Rolling Response Due", "Rolling Response Due"),
    ("Failed", "Failed"),
    ("Fulfilled", "Fulfilled"),
]


class CRMServiceLevelAgreement(models.Model):
    name = models.CharField(max_length=140, primary_key=True, editable=False)
    sla_name = models.CharField(max_length=140)
    apply_on = models.CharField(max_length=20, choices=APPLY_ON_CHOICES)
    enabled = models.BooleanField(default=True)
    default = models.BooleanField(default=False)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    condition = models.TextField(blank=True)
    condition_json = models.TextField(blank=True)
    rolling_responses = models.BooleanField(default=False)
    holiday_list = models.ForeignKey(
        "crm.CRMHolidayList", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        app_label = "crm"
        db_table = "crm_service_level_agreement"
        verbose_name = "CRM Service Level Agreement"

    def __str__(self):
        return self.sla_name or self.name

    def save(self, *args, **kwargs):
        # autoname: field:sla_name -- the name IS the sla_name, same as the
        # real doctype (renaming happens by changing sla_name and calling
        # rename_doc, not by regenerating a fresh id).
        if not self.name:
            self.name = self.sla_name
        self.validate_default()
        self.validate_condition()
        super().save(*args, **kwargs)

    # -- validation -----------------------------------------------------------

    def validate_default(self):
        if self.default:
            clash = (
                type(self)
                .objects.filter(apply_on=self.apply_on, default=True)
                .exclude(pk=self.pk)
                .exists()
            )
            if clash:
                raise ValidationError(f"Default Service Level Agreement already exists for {self.apply_on}")

    def validate_condition(self):
        if not self.condition:
            return
        try:
            evaluate_condition(self.condition, {})
        except UnsafeConditionError as exc:
            raise ValidationError(f"The Condition '{self.condition}' is invalid: {exc}") from exc

    # -- apply (before_save hook on the Lead/Deal) -----------------------------

    def apply(self, doc):
        self.handle_creation(doc)
        self.handle_communication_status(doc)
        self.handle_targets(doc)
        self.handle_sla_status(doc)
        self.handle_rolling_sla_status(doc)

    def handle_creation(self, doc):
        doc.sla_creation = doc.sla_creation or timezone.now()

    def handle_communication_status(self, doc):
        if doc._state.adding or not doc.communication_status_changed:
            return
        self.set_first_responded_on(doc)
        self.set_first_response_time(doc)
        if self.rolling_responses:
            self.set_rolling_responses(doc)

    def set_first_responded_on(self, doc):
        if doc.communication_status_id != self.get_default_priority():
            doc.first_responded_on = doc.first_responded_on or timezone.now()
            doc.last_responded_on = doc.last_responded_on or doc.first_responded_on

    def set_first_response_time(self, doc):
        start_at = doc.sla_creation
        end_at = doc.first_responded_on
        if not start_at or not end_at:
            return
        if doc.first_response_time is None:
            doc.first_response_time = timedelta(seconds=self.calc_elapsed_time(start_at, end_at))
        if doc.last_response_time is None and doc.first_response_time is not None:
            doc.last_response_time = doc.first_response_time

    def set_rolling_responses(self, doc):
        if doc.last_response_time is None or not doc.last_responded_on:
            return
        existing = list(doc.rolling_responses.all())
        if not existing and not getattr(doc, "_pending_child_rows", {}).get("rolling_responses"):
            doc.buffer_child_row(
                "rolling_responses",
                response_time=doc.last_response_time,
                responded_on=doc.last_responded_on,
                status="Failed" if self.is_first_response_failed(doc) else "Fulfilled",
            )
        elif doc.communication_status_id != self.get_default_priority():
            current_time = timezone.now()
            doc.last_response_time = timedelta(seconds=self.calc_elapsed_time(doc.last_responded_on, current_time))
            doc.last_responded_on = current_time
            is_failed = self.is_rolling_response_failed(doc)
            doc.buffer_child_row(
                "rolling_responses",
                response_time=doc.last_response_time,
                responded_on=doc.last_responded_on,
                status="Failed" if is_failed else "Fulfilled",
            )

    def handle_targets(self, doc):
        self.set_response_by(doc)
        has_rolling = doc.rolling_responses.exists() or getattr(doc, "_pending_child_rows", {}).get(
            "rolling_responses"
        )
        if self.rolling_responses and has_rolling:
            self.set_rolling_response_by(doc)

    def set_response_by(self, doc):
        start_time = doc.sla_creation
        communication_status = doc.communication_status_id

        priorities = self.get_priorities()
        priority = priorities.get(communication_status)
        if not priority or doc.response_by:
            return

        first_response_time = priority.first_response_time.total_seconds() if priority.first_response_time else 0
        end_time = self.calc_time(start_time, first_response_time)
        if end_time:
            doc.response_by = end_time

    def _update_rolling_response_by(self, doc):
        default_priority = self.get_default_priority()
        if doc.communication_status_id != default_priority:
            return
        priorities = self.get_priorities()
        priority = priorities.get(default_priority)
        if not priority:
            return
        rolling_response_time = priority.first_response_time.total_seconds() if priority.first_response_time else 0
        end_time = self.calc_time(timezone.now(), rolling_response_time)
        if end_time:
            doc.response_by = end_time

    def set_rolling_response_by(self, doc):
        if not doc.response_by or not doc.last_responded_on:
            return
        self._update_rolling_response_by(doc)

    def handle_sla_status(self, doc):
        is_failed = self.is_first_response_failed(doc)
        options = {
            "Fulfilled": True,
            "First Response Due": not doc.first_responded_on,
            "Failed": is_failed,
        }
        for status, matched in options.items():
            if matched:
                doc.sla_status = status

    def is_first_response_failed(self, doc):
        if not doc.first_responded_on:
            return _as_datetime(doc.response_by) < timezone.now()
        return _as_datetime(doc.response_by) < _as_datetime(doc.first_responded_on)

    def handle_rolling_sla_status(self, doc):
        has_rolling = doc.rolling_responses.exists() or getattr(doc, "_pending_child_rows", {}).get(
            "rolling_responses"
        )
        if not self.rolling_responses or not has_rolling:
            return
        is_failed = self.is_rolling_response_failed(doc)
        options = {
            "Fulfilled": True,
            "Rolling Response Due": doc.communication_status_id == self.get_default_priority(),
            "Failed": is_failed,
        }
        for status, matched in options.items():
            if matched:
                doc.sla_status = status

    def is_rolling_response_failed(self, doc):
        if not doc.response_by:
            return False
        if doc.communication_status_id == self.get_default_priority():
            return _as_datetime(doc.response_by) < timezone.now()
        if not doc.last_responded_on:
            return _as_datetime(doc.response_by) < timezone.now()
        return _as_datetime(doc.response_by) < _as_datetime(doc.last_responded_on)

    # -- time math --------------------------------------------------------------

    @staticmethod
    def _time_to_seconds(time_obj):
        if isinstance(time_obj, timedelta):
            return time_obj.total_seconds()
        return time_obj.hour * 3600 + time_obj.minute * 60 + time_obj.second

    def calc_time(self, start_at, duration_seconds):
        res = _as_datetime(start_at)
        time_needed = duration_seconds
        holidays = self.get_holidays()
        workdays = self.get_workdays()
        # No working-hours rows configured on this SLA (or every day is a
        # holiday) means no day is ever a valid workday -- the loop below
        # would add a day forever and overflow datetime's range. Real Frappe
        # never hits this because "Support and Availability" is a mandatory
        # child table; this port's SLA policies can exist without one, so
        # treat "nothing to calculate against" as "can't apply a due date"
        # instead of spinning forever.
        if not workdays:
            return res
        days_checked = 0
        while time_needed:
            days_checked += 1
            if days_checked > 3650:
                return res
            today_day = res.date()
            today_weekday = WEEKDAYS[res.weekday()]
            is_workday = today_weekday in workdays
            is_holiday = today_day in holidays
            if is_holiday or not is_workday:
                res = res + timedelta(days=1)
                continue
            today_workday = workdays[today_weekday]
            now_in_seconds = (res - datetime.combine(today_day, datetime.min.time(), tzinfo=res.tzinfo)).total_seconds()

            start_time_seconds = self._time_to_seconds(today_workday.start_time)
            end_time_seconds = self._time_to_seconds(today_workday.end_time)

            start_time = max(start_time_seconds, now_in_seconds)
            till_start_time = max(start_time - now_in_seconds, 0)
            end_time = max(end_time_seconds, now_in_seconds)
            time_left = max(end_time - start_time, 0)
            if not time_left:
                res = res + timedelta(days=1)
                continue
            time_taken = min(time_needed, time_left)
            time_needed -= time_taken
            time_required = till_start_time + time_taken
            res = res + timedelta(seconds=time_required)
        return res

    def calc_elapsed_time(self, start_time, end_time) -> float:
        start_time = _as_datetime(start_time)
        end_time = _as_datetime(end_time)
        holiday_list = self.get_holidays()
        working_day_list = self.get_working_days()
        working_hours = self.get_working_hours()

        total_seconds = 0
        current_time = start_time
        while current_time < end_time:
            in_holiday_list = current_time.date() in holiday_list
            not_in_working_day_list = WEEKDAYS[current_time.weekday()] not in working_day_list
            if in_holiday_list or not_in_working_day_list or not self.is_working_time(current_time, working_hours):
                current_time += timedelta(seconds=1)
                continue
            total_seconds += 1
            current_time += timedelta(seconds=1)
        return total_seconds

    def get_priorities(self):
        return {row.priority_id: row for row in self.priorities.all()}

    def get_default_priority(self):
        priorities = list(self.priorities.all())
        for row in priorities:
            if row.default_priority:
                return row.priority_id
        return priorities[0].priority_id if priorities else None

    def get_workdays(self):
        return {row.workday: row for row in self.working_hours.all()}

    def get_working_days(self):
        return [row.workday for row in self.working_hours.all()]

    def get_working_hours(self):
        return {row.workday: (row.start_time, row.end_time) for row in self.working_hours.all()}

    def is_working_time(self, date_time, working_hours):
        day_of_week = WEEKDAYS[date_time.weekday()]
        start_time, end_time = working_hours.get(day_of_week, (0, 0))
        if start_time == 0 and end_time == 0:
            return False
        date_time_seconds = timedelta(
            hours=date_time.hour, minutes=date_time.minute, seconds=date_time.second
        ).total_seconds()
        return self._time_to_seconds(start_time) <= date_time_seconds < self._time_to_seconds(end_time)

    def get_holidays(self):
        if not self.holiday_list_id:
            return []
        return list(self.holiday_list.holidays.values_list("date", flat=True))


def _as_datetime(value):
    if value is None:
        return timezone.now()
    if isinstance(value, datetime):
        return value
    return datetime.combine(value, datetime.min.time())
