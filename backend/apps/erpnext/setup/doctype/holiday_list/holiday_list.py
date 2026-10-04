import frappe
import calendar
from datetime import date, timedelta
from dateutil import relativedelta

from apps.frappe.model.document import Document
from apps.frappe.runtime import local
from apps.frappe.utils import getdate, today
from apps.frappe import exceptions
from apps.erpnext.registry import get_model


class OverlapError(exceptions.ValidationError):
    pass


class HolidayList(Document):
    doctype = "Holiday List"

    def validate(self):
        self.validate_days()
        self.update_total_holidays()
        self.validate_duplicate_date()
        self.sort_holidays()

    def update_total_holidays(self):
        self.total_holidays = sum(0.5 if int(getattr(holiday, "is_half_day", 0)) else 1 for holiday in self.get("holidays", []))

    @frappe.whitelist()
    def get_weekly_off_dates(self):
        if not self.get("weekly_off"):
            raise exceptions.ValidationError("Please select weekly off day")

        existing_holidays = self.get_holidays()

        for d in self.get_weekly_off_date_list(self.get("from_date"), self.get("to_date")):
            if d in existing_holidays:
                continue

            self.append(
                "holidays",
                {
                    "description": str(self.weekly_off),
                    "holiday_date": d,
                    "weekly_off": 1,
                    "is_half_day": getattr(self, "is_half_day", 0),
                },
            )

        self.update_total_holidays()

    @frappe.whitelist()
    def get_supported_countries(self):
        from holidays.utils import list_supported_countries

        subdivisions_by_country = list_supported_countries()
        countries = [
            {"value": country, "label": local_country_name(country)}
            for country in subdivisions_by_country.keys()
        ]
        return {
            "countries": countries,
            "subdivisions_by_country": subdivisions_by_country,
        }

    @frappe.whitelist()
    def get_local_holidays(self):
        from holidays import country_holidays

        if not self.get("country"):
            raise exceptions.ValidationError("Please select a country")

        existing_holidays = self.get_holidays()
        from_date = getdate(self.get("from_date"))
        to_date = getdate(self.get("to_date"))

        for holiday_date, holiday_name in country_holidays(
            self.country,
            subdiv=getattr(self, "subdivision", None),
            years=list(range(from_date.year, to_date.year + 1)),
        ).items():
            if holiday_date in existing_holidays:
                continue

            if holiday_date < from_date or holiday_date > to_date:
                continue

            self.append(
                "holidays", {"description": holiday_name, "holiday_date": holiday_date, "weekly_off": 0}
            )

        self.update_total_holidays()

    def sort_holidays(self):
        holidays = self.get("holidays", [])
        holidays.sort(key=lambda x: (getattr(x, "weekly_off", 0), getdate(x.holiday_date)))
        for i in range(len(holidays)):
            holidays[i].idx = i + 1

    def get_holidays(self) -> list[date]:
        return [getdate(holiday.holiday_date) for holiday in self.get("holidays", [])]

    def validate_days(self):
        from_date = self.get("from_date")
        to_date = self.get("to_date")
        if not from_date or not to_date:
            return
            
        if getdate(from_date) > getdate(to_date):
            raise exceptions.ValidationError("To Date cannot be before From Date")

        for day in self.get("holidays", []):
            if not (getdate(from_date) <= getdate(day.holiday_date) <= getdate(to_date)):
                raise exceptions.ValidationError(
                    f"The holiday on {day.holiday_date} is not between From Date and To Date"
                )

    def get_weekly_off_date_list(self, start_date, end_date):
        if not start_date or not end_date:
            return []
            
        start_date, end_date = getdate(start_date), getdate(end_date)

        date_list = []
        existing_date_list = []
        weekday = getattr(calendar, (self.weekly_off).upper())
        reference_date = start_date + relativedelta.relativedelta(weekday=weekday)

        existing_date_list = [getdate(holiday.holiday_date) for holiday in self.get("holidays", [])]

        while reference_date <= end_date:
            if reference_date not in existing_date_list:
                date_list.append(reference_date)
            reference_date += timedelta(days=7)

        return date_list

    def clear_table(self):
        self.set("holidays", [])
        self.update_total_holidays()

    def validate_duplicate_date(self):
        unique_dates = []
        for row in self.get("holidays", []):
            if row.holiday_date in unique_dates:
                raise exceptions.ValidationError(
                    f"Holiday Date {row.holiday_date} added multiple times"
                )

            unique_dates.append(row.holiday_date)


def local_country_name(country_code: str) -> str:
    from babel import Locale

    return Locale.parse(local.lang, sep="-").territories.get(country_code, country_code)


def get_events(start, end, filters=None):
    pass


def is_holiday(holiday_list, req_date=None):
    if req_date is None:
        req_date = today()
    if holiday_list:
        HolidayModel = get_model("Holiday")
        try:
            return HolidayModel.objects.filter(
                parent=holiday_list, holiday_date=req_date, is_half_day=0
            ).exists()
        except LookupError:
            return False
    else:
        return False


def is_half_holiday(holiday_list, req_date=None):
    if req_date is None:
        req_date = today()
    if holiday_list:
        HolidayModel = get_model("Holiday")
        try:
            return HolidayModel.objects.filter(
                parent=holiday_list, holiday_date=req_date, is_half_day=1
            ).exists()
        except LookupError:
            return False
    else:
        return False
