from contextlib import contextmanager
from datetime import date, timedelta

from django.test import TestCase

import frappe
from apps.erpnext.setup.doctype.holiday_list.holiday_list import HolidayList, local_country_name
from apps.frappe.runtime import get_doc, session
from apps.frappe.utils import getdate


class TestHolidayList(TestCase):
    def setUp(self):
        session.user = "Administrator"

    def test_controller_class_is_resolved(self):
        holiday_list = make_holiday_list("test_controller_class")
        self.assertIsInstance(get_doc("Holiday List", holiday_list.name), HolidayList)

    def test_holiday_list(self):
        today_date = getdate()
        test_holiday_dates = [today_date - timedelta(days=5), today_date - timedelta(days=4)]
        holiday_list = make_holiday_list(
            "test_holiday_list",
            holiday_dates=[
                {"holiday_date": test_holiday_dates[0], "description": "test holiday"},
                {"holiday_date": test_holiday_dates[1], "description": "test holiday2"},
            ],
        )
        fetched_holiday_list = frappe.db.get_value("Holiday List", holiday_list.name)
        self.assertEqual(holiday_list.name, fetched_holiday_list)

    def test_weekly_off(self):
        holiday_list = frappe.new_doc("Holiday List")
        holiday_list.from_date = "2023-01-01"
        holiday_list.to_date = "2023-02-28"
        holiday_list.weekly_off = "Sunday"
        holiday_list.get_weekly_off_dates()

        holidays = [holiday.holiday_date for holiday in holiday_list.holidays]

        self.assertNotIn(date(2022, 12, 25), holidays)
        for expected in (
            date(2023, 1, 1),
            date(2023, 1, 8),
            date(2023, 1, 15),
            date(2023, 1, 22),
            date(2023, 1, 29),
            date(2023, 2, 5),
            date(2023, 2, 12),
            date(2023, 2, 19),
            date(2023, 2, 26),
        ):
            self.assertIn(expected, holidays)
        self.assertNotIn(date(2023, 3, 5), holidays)

    def test_total_holidays_includes_half_days(self):
        holiday_list = make_holiday_list(
            "test_half_day_holiday_list",
            from_date="2023-01-01",
            to_date="2023-01-03",
            holiday_dates=[
                {"holiday_date": "2023-01-01", "description": "Full-day holiday"},
                {"holiday_date": "2023-01-02", "description": "Half-day holiday", "is_half_day": 1},
            ],
        )

        self.assertEqual(holiday_list.total_holidays, 1.5)
        self.assertEqual(frappe.db.get_value("Holiday List", holiday_list.name, "total_holidays"), 1.5)

    def test_weekly_off_updates_total_without_saving(self):
        holiday_list = frappe.new_doc("Holiday List")
        holiday_list.from_date = "2023-01-01"
        holiday_list.to_date = "2023-01-14"
        holiday_list.weekly_off = "Saturday"
        holiday_list.is_half_day = 1
        holiday_list.append("holidays", {"holiday_date": "2023-01-01", "description": "Full day"})

        holiday_list.get_weekly_off_dates()
        self.assertEqual(len(holiday_list.holidays), 3)
        self.assertEqual(holiday_list.total_holidays, 2)

        holiday_list.get_weekly_off_dates()
        self.assertEqual(len(holiday_list.holidays), 3)
        self.assertEqual(holiday_list.total_holidays, 2)

        holiday_list.clear_table()
        self.assertEqual(holiday_list.holidays, [])
        self.assertEqual(holiday_list.total_holidays, 0)

    def test_local_holidays_updates_total_without_saving(self):
        holiday_list = frappe.new_doc("Holiday List")
        holiday_list.from_date = "2023-01-01"
        holiday_list.to_date = "2023-01-02"
        holiday_list.country = "DE"
        holiday_list.append("holidays", {"holiday_date": "2023-01-02", "description": "Half day", "is_half_day": 1})

        holiday_list.get_local_holidays()
        self.assertEqual(len(holiday_list.holidays), 2)
        self.assertEqual(holiday_list.total_holidays, 1.5)

        holiday_list.get_local_holidays()
        self.assertEqual(len(holiday_list.holidays), 2)
        self.assertEqual(holiday_list.total_holidays, 1.5)

    def test_local_holidays(self):
        holiday_list = frappe.new_doc("Holiday List")
        holiday_list.from_date = "2022-01-01"
        holiday_list.to_date = "2024-12-31"
        holiday_list.country = "DE"
        holiday_list.subdivision = "SN"
        holiday_list.get_local_holidays()

        holidays = holiday_list.get_holidays()
        for expected in (
            date(2022, 1, 1),
            date(2022, 4, 15),
            date(2022, 4, 18),
            date(2022, 5, 1),
            date(2022, 5, 26),
            date(2022, 6, 6),
            date(2022, 10, 3),
            date(2022, 10, 31),
            date(2022, 11, 16),
            date(2022, 12, 25),
            date(2022, 12, 26),
            date(2023, 1, 1),
            date(2023, 4, 7),
            date(2023, 4, 10),
            date(2023, 5, 1),
            date(2023, 5, 18),
            date(2023, 5, 29),
            date(2023, 10, 3),
            date(2023, 10, 31),
            date(2023, 11, 22),
            date(2023, 12, 25),
            date(2023, 12, 26),
            date(2024, 1, 1),
            date(2024, 3, 29),
            date(2024, 4, 1),
            date(2024, 5, 1),
            date(2024, 5, 9),
            date(2024, 5, 20),
            date(2024, 10, 3),
            date(2024, 10, 31),
            date(2024, 11, 20),
            date(2024, 12, 25),
            date(2024, 12, 26),
        ):
            self.assertIn(expected, holidays)

        for unexpected in (
            date(2022, 1, 2),
            date(2023, 4, 16),
            date(2024, 4, 19),
            date(2022, 5, 2),
            date(2023, 5, 27),
            date(2024, 6, 7),
            date(2022, 10, 4),
            date(2023, 10, 30),
            date(2024, 11, 17),
            date(2022, 12, 24),
        ):
            self.assertNotIn(unexpected, holidays)

    def test_localized_country_names(self):
        lang = frappe.local.lang
        frappe.local.lang = "en-gb"
        self.assertEqual(local_country_name("IN"), "India")
        self.assertEqual(local_country_name("DE"), "Germany")

        frappe.local.lang = "de"
        self.assertEqual(local_country_name("DE"), "Deutschland")
        frappe.local.lang = lang

    def test_get_supported_countries(self):
        holiday_list = frappe.new_doc("Holiday List")
        result = holiday_list.get_supported_countries()
        values = {country["value"] for country in result["countries"]}
        self.assertIn("DE", values)
        self.assertIn("KE", values)
        self.assertIn("SN", result["subdivisions_by_country"]["DE"])


def make_holiday_list(name, from_date=None, to_date=None, holiday_dates=None):
    if from_date is None:
        from_date = getdate() - timedelta(days=10)

    if to_date is None:
        to_date = getdate()

    frappe.delete_doc_if_exists("Holiday List", name, force=1)
    doc = frappe.get_doc(
        {
            "doctype": "Holiday List",
            "holiday_list_name": name,
            "from_date": from_date,
            "to_date": to_date,
            "holidays": holiday_dates,
        }
    ).insert()
    return doc


@contextmanager
def set_holiday_list(holiday_list, company_name):
    try:
        company = frappe.get_doc("Company", company_name)
        previous_holiday_list = company.default_holiday_list

        company.default_holiday_list = holiday_list
        company.save()

        yield

    finally:
        company = frappe.get_doc("Company", company_name)
        company.default_holiday_list = previous_holiday_list
        company.save()
