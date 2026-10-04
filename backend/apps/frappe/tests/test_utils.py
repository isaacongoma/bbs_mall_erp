
import io
import json
import os
import sys
from datetime import UTC, date, datetime, time, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal, localcontext
from enum import Enum
from io import StringIO
from mimetypes import guess_type
from unittest.mock import patch

from hypothesis import given
from hypothesis import strategies as st
from PIL import Image

from apps import frappe
from hypothesis.extra.django import TestCase
from apps.frappe.utils import (
	ceil,
	dict_to_str,
	execute_in_shell,
	floor,
	flt,
	format_timedelta,
	get_bench_path,
	get_file_timestamp,
	get_identicon,
	get_link_to_report,
	get_safe_filters,
	get_site_info,
	get_sites,
	get_url,
	is_valid_iban,
	money_in_words,
	parse_and_map_trackers_from_url,
	parse_timedelta,
	random_string,
	remove_blanks,
	safe_json_loads,
	scrub_urls,
	validate_email_address,
	validate_name,
	validate_phone_number_with_country_code,
	validate_url,
)

from apps.frappe.utils.data import (
	add_to_date,
	add_trackers_to_url,
	add_years,
	cast,
	cint,
	comma_and,
	comma_or,
	compare,
	cstr,
	duration_to_seconds,
	evaluate_filters,
	expand_relative_urls,
	format_duration,
	get_datetime,
	get_first_day_of_week,
	get_time,
	get_timedelta,
	get_timespan_date_range,
	get_url_to_form,
	get_year_ending,
	getdate,
	is_invalid_date_string,
	map_trackers,
	now_datetime,
	nowtime,
	orjson_dumps,
	pretty_date,
	rounded,
	sha256_hash,
	to_timedelta,
	validate_python_code,
)
from frappe.utils.dateutils import get_dates_from_timegrain
from frappe.utils.diff import _get_value_from_version, get_version_diff, version_query
from frappe.utils.identicon import Identicon
from frappe.utils.image import optimize_image, strip_exif_data
from frappe.utils.make_random import can_make, get_random, how_many
from frappe.utils.response import json_handler
from frappe.utils.synchronization import LockTimeoutError, filelock
from frappe.utils.typing_validations import FrappeTypeError, validate_argument_types


class Capturing(TestCase):
    pass












class TestFilters(TestCase):
    pass




















































































































































































































































































































class TestMoney(TestCase):
	def test_money_in_words(self):
		test_cases = {
			"BHD": [
				(5000, "BHD Five Thousand only."),
				(5000.0, "BHD Five Thousand only."),
				(0.1, "One Hundred Fils only."),
				(0, "BHD Zero only."),
				("Fail", ""),
			],
			"NGN": [
				(5000, "NGN Five Thousand only."),
				(5000.0, "NGN Five Thousand only."),
				(0.1, "Ten Kobo only."),
				(0, "NGN Zero only."),
				("Fail", ""),
			],
			"MRO": [
				(5000, "MRO Five Thousand only."),
				(5000.0, "MRO Five Thousand only."),
				(1.4, "MRO One and Two Khoums only."),
				(0.2, "One Khoums only."),
				(0, "MRO Zero only."),
				("Fail", ""),
			],
		}

		for currency, cases in test_cases.items():
			for money, expected_words in cases:
				words = money_in_words(money, currency)
				self.assertEqual(
					words,
					expected_words,
					f"{words} is not the same as {expected_words}",
				)

	def test_money_in_words_without_fraction(self):
		words = money_in_words("42.01", "VND")
		self.assertEqual(words, "VND Forty Two only.")


class TestDataManipulation(TestCase):
	def test_scrub_urls(self):
		html = """
			<p>You have a new message from: <b>John</b></p>
			<p>Hey, wassup!</p>
			<div class="more-info">
				<a href="http://test.com">Test link 1</a>
				<a href="/about">Test link 2</a>
				<a href="login">Test link 3</a>
				<img src="/assets/frappe/test.jpg">
			</div>
			<div style="background-image: url('/assets/frappe/bg.jpg')">
				Please mail us at <a href="mailto:test@example.com">email</a>
			</div>
		"""

		html = scrub_urls(html)
		url = get_url()

		self.assertTrue('<a href="http://test.com">Test link 1</a>' in html)
		self.assertTrue(f'<a href="{url}/about">Test link 2</a>' in html)
		self.assertTrue(f'<a href="{url}/login">Test link 3</a>' in html)
		self.assertTrue(f'<img src="{url}/assets/frappe/test.jpg">' in html)
		self.assertTrue(f"style=\"background-image: url('{url}/assets/frappe/bg.jpg') !important\"" in html)
		self.assertTrue('<a href="mailto:test@example.com">email</a>' in html)


class TestFieldCasting(TestCase):
	def test_str_types(self):
		STR_TYPES = (
			"Data",
			"Text",
			"Small Text",
			"Long Text",
			"Text Editor",
			"Select",
			"Link",
			"Dynamic Link",
		)
		for fieldtype in STR_TYPES:
			self.assertIsInstance(cast(fieldtype, value=None), str)
			self.assertIsInstance(cast(fieldtype, value="12-12-2021"), str)
			self.assertIsInstance(cast(fieldtype, value=""), str)
			self.assertIsInstance(cast(fieldtype, value=[]), str)
			self.assertIsInstance(cast(fieldtype, value=set()), str)

	def test_float_types(self):
		FLOAT_TYPES = ("Currency", "Float", "Percent")
		for fieldtype in FLOAT_TYPES:
			self.assertIsInstance(cast(fieldtype, value=None), float)
			self.assertIsInstance(cast(fieldtype, value=1.12), float)
			self.assertIsInstance(cast(fieldtype, value=112), float)

	def test_int_types(self):
		INT_TYPES = ("Int", "Check")

		for fieldtype in INT_TYPES:
			self.assertIsInstance(cast(fieldtype, value=None), int)
			self.assertIsInstance(cast(fieldtype, value=1.12), int)
			self.assertIsInstance(cast(fieldtype, value=112), int)

	def test_datetime_types(self):
		self.assertIsInstance(cast("Datetime", value=None), datetime)
		self.assertIsInstance(cast("Datetime", value="12-2-22"), datetime)

	def test_date_types(self):
		self.assertIsInstance(cast("Date", value=None), date)
		self.assertIsInstance(cast("Date", value="12-12-2021"), date)

	def test_time_types(self):
		self.assertIsInstance(cast("Time", value=None), timedelta)
		self.assertIsInstance(cast("Time", value="12:03:34"), timedelta)


class TestMathUtils(TestCase):
	def test_floor(self):
		from decimal import Decimal

		self.assertEqual(floor(2), 2)
		self.assertEqual(floor(12.32904), 12)
		self.assertEqual(floor(22.7330), 22)
		self.assertEqual(floor("24.7"), 24)
		self.assertEqual(floor("26.7"), 26)
		self.assertEqual(floor(Decimal("29.45")), 29)

	def test_ceil(self):
		from decimal import Decimal

		self.assertEqual(ceil(2), 2)
		self.assertEqual(ceil(12.32904), 13)
		self.assertEqual(ceil(22.7330), 23)
		self.assertEqual(ceil("24.7"), 25)
		self.assertEqual(ceil("26.7"), 27)
		self.assertEqual(ceil(Decimal("29.45")), 30)


class TestHTMLUtils(TestCase):
    pass































































































class TestValidationUtils(TestCase):
	def test_valid_url(self):
		self.assertFalse(validate_url(""))
		self.assertFalse(validate_url(None))

		self.assertTrue(validate_url("https://google.com"))
		self.assertTrue(validate_url("http://frappe.io", throw=True))

		self.assertFalse(validate_url("google.io"))
		self.assertFalse(validate_url("google.io"))

		self.assertRaises(frappe.ValidationError, validate_url, "frappe", throw=True)

		self.assertFalse(validate_url("https://google.com", valid_schemes="http"))
		self.assertTrue(validate_url("ftp://frappe.cloud", valid_schemes=["https", "ftp"]))
		self.assertFalse(validate_url("bolo://frappe.io", valid_schemes=("http", "https", "ftp", "ftps")))
		self.assertRaises(
			frappe.ValidationError,
			validate_url,
			"gopher://frappe.io",
			valid_schemes="https",
			throw=True,
		)

	def test_valid_email(self):
		self.assertFalse(validate_email_address(""))
		self.assertFalse(validate_email_address(None))

		self.assertTrue(validate_email_address("someone@frappe.com"))
		self.assertTrue(validate_email_address("someone@frappe.com, anyone@frappe.io"))
		self.assertTrue(validate_email_address("test%201@frappe.com"))

		self.assertFalse(validate_email_address("someone"))
		self.assertFalse(validate_email_address("someone@----.com"))
		self.assertFalse(validate_email_address("test 1@frappe.com"))
		self.assertFalse(validate_email_address("test@example.com test2@example.com,undisclosed-recipient"))

		self.assertRaises(
			frappe.InvalidEmailAddressError,
			validate_email_address,
			"someone.com",
			throw=True,
		)

		self.assertEqual(validate_email_address("Some%20One@frappe.com"), "Some%20One@frappe.com")
		self.assertEqual(
			validate_email_address("erp+Job%20Applicant=JA00004@frappe.com"),
			"erp+Job%20Applicant=JA00004@frappe.com",
		)

		self.assertEqual(
			validate_email_address('"Lastname, Firstname" <test@example.com>'), "test@example.com"
		)
		self.assertEqual(validate_email_address('"Doe, John" <john.doe@example.com>'), "john.doe@example.com")

		self.assertEqual(validate_email_address("Test User <test@example.com>"), "test@example.com")

		self.assertEqual(
			validate_email_address('"Last, First" <test1@example.com>, "Another, Name" <test2@example.com>'),
			"test1@example.com, test2@example.com",
		)

		self.assertEqual(
			validate_email_address("Test User <test@example.com>, plain@example.com"),
			"test@example.com, plain@example.com",
		)

		self.assertEqual(
			validate_email_address("test1@example.com\ntest2@example.com"),
			"test1@example.com, test2@example.com",
		)

		self.assertEqual(validate_email_address("undisclosed-recipients:;"), "")
		self.assertEqual(
			validate_email_address("test@example.com, undisclosed-recipients:;"), "test@example.com"
		)

		self.assertEqual(
			validate_email_address("invalid, foo@bar.baz@baz, bar@bar.baz"),
			"bar@bar.baz",
		)

		self.assertEqual(
			validate_email_address('"Smith, John" <john@example.com>, bad@@email'),
			"john@example.com",
		)

		self.assertFalse(validate_email_address("alice@example.com)"))
		self.assertFalse(validate_email_address("alice@example.com (unclosed comment"))
		self.assertFalse(validate_email_address("alice@[192.168.0.1"))

		self.assertFalse(validate_email_address("alice@example.com."))
		self.assertFalse(validate_email_address("alice@example.com.."))
		self.assertFalse(validate_email_address("alice@example.com#fragment"))
		self.assertFalse(validate_email_address("alice@example.com\x00"))

		self.assertEqual(
			validate_email_address("test1@example.com\r\ntest2@example.com"),
			"test1@example.com, test2@example.com",
		)

		self.assertRaises(
			frappe.InvalidEmailAddressError,
			validate_email_address,
			"alice@example.com)",
			throw=True,
		)

	def test_valid_phone(self):
		valid_phones = ["+91 1234567890", ""]

		for phone in valid_phones:
			validate_phone_number_with_country_code(phone, "field")
		self.assertRaises(
			frappe.InvalidPhoneNumberError,
			validate_phone_number_with_country_code,
			"+420 1234567890",
			"field",
		)

	def test_validate_name(self):
		valid_names = ["", "abc", "asd a13", "asd-asd"]
		for name in valid_names:
			validate_name(name, True)

		invalid_names = ["asd$wat", "asasd/ads"]
		for name in invalid_names:
			self.assertRaises(frappe.InvalidNameError, validate_name, name, True)

	def test_validate_iban(self):
		valid_ibans = [
			"GB82 WEST 1234 5698 7654 32",
			"DE91 1000 0000 0123 4567 89",
			"FR76 3000 6000 0112 3456 7890 189",
		]

		invalid_ibans = [
			"GB72 WEST 1234 5698 7654 32",
			"DE81 1000 0000 0123 4567 89",
			"FR66 3000 6000 0112 3456 7890 189",
		]

		for iban in valid_ibans:
			self.assertTrue(is_valid_iban(iban))

		for not_iban in invalid_ibans:
			self.assertFalse(is_valid_iban(not_iban))

	def test_parse_json_passthrough_and_decode(self):
		from apps.frappe.utils.data import parse_json

		self.assertEqual(parse_json({"a": 1}), {"a": 1})
		self.assertEqual(parse_json([1, 2]), [1, 2])
		self.assertEqual(parse_json(None), None)
		self.assertEqual(parse_json(1), 1)

		self.assertEqual(parse_json('{"a": 1}'), {"a": 1})
		self.assertEqual(parse_json("[1, 2]"), [1, 2])

		self.assertEqual(parse_json('{"a": 1}').a, 1)


class TestImage(TestCase):
    pass































class TestPythonExpressions(TestCase):
    pass


























class TestDiffUtils(TestCase):
    pass









































class TestDateUtils(TestCase):
	def test_first_day_of_week(self):
		with patch.object(frappe.utils.data, "get_first_day_of_the_week", return_value="Monday"):
			self.assertEqual(
				frappe.utils.get_first_day_of_week("2020-12-25"),
				frappe.utils.getdate("2020-12-21"),
			)
			self.assertEqual(
				frappe.utils.get_first_day_of_week("2020-12-20"),
				frappe.utils.getdate("2020-12-14"),
			)

		self.assertEqual(
			frappe.utils.get_first_day_of_week("2020-12-25"),
			frappe.utils.getdate("2020-12-20"),
		)
		self.assertEqual(
			frappe.utils.get_first_day_of_week("2020-12-21"),
			frappe.utils.getdate("2020-12-20"),
		)

	def test_last_day_of_week(self):
		self.assertEqual(
			frappe.utils.get_last_day_of_week("2020-12-24"),
			frappe.utils.getdate("2020-12-26"),
		)
		self.assertEqual(
			frappe.utils.get_last_day_of_week("2020-12-28"),
			frappe.utils.getdate("2021-01-02"),
		)

	def test_is_last_day_of_the_month(self):
		self.assertEqual(frappe.utils.is_last_day_of_the_month("2020-12-24"), False)
		self.assertEqual(frappe.utils.is_last_day_of_the_month("2020-12-31"), True)

	def test_get_timezone_utc_offset(self):
		self.assertEqual(frappe.utils.data.get_timezone_utc_offset("UTC"), "+00:00")
		self.assertEqual(frappe.utils.data.get_timezone_utc_offset("Asia/Kolkata"), "+05:30")
		self.assertEqual(frappe.utils.data.get_timezone_utc_offset("Pacific/Marquesas"), "-09:30")

	def test_get_time(self):
		datetime_input = now_datetime()
		timedelta_input = get_timedelta()
		time_input = nowtime()

		self.assertIsInstance(get_time(datetime_input), time)
		self.assertIsInstance(get_time(timedelta_input), time)
		self.assertIsInstance(get_time(time_input), time)
		self.assertIsInstance(get_time("100:2:12"), time)
		self.assertIsInstance(get_time(str(datetime_input)), time)
		self.assertIsInstance(get_time(str(timedelta_input)), time)
		self.assertIsInstance(get_time(str(time_input)), time)

	def test_get_timedelta(self):
		datetime_input = now_datetime()
		timedelta_input = get_timedelta()
		time_input = nowtime()

		self.assertIsInstance(get_timedelta(), timedelta)
		self.assertIsInstance(get_timedelta("100:2:12"), timedelta)
		self.assertIsInstance(get_timedelta("17:21:00"), timedelta)
		self.assertIsInstance(get_timedelta("2012-01-19 17:21:00"), timedelta)
		self.assertIsInstance(get_timedelta(str(datetime_input)), timedelta)
		self.assertIsInstance(get_timedelta(str(timedelta_input)), timedelta)
		self.assertIsInstance(get_timedelta(str(time_input)), timedelta)
		self.assertIsInstance(get_timedelta(get_timedelta("100:2:12")), timedelta)

	def test_to_timedelta(self):
		self.assertEqual(to_timedelta("00:00:01"), timedelta(seconds=1))
		self.assertEqual(to_timedelta("10:00:01"), timedelta(seconds=1, hours=10))
		self.assertEqual(to_timedelta(time(hour=2)), timedelta(hours=2))

	def test_add_date_utils(self):
		self.assertEqual(add_years(datetime(2020, 1, 1), 1), datetime(2021, 1, 1))

	def test_duration_to_sec(self):
		self.assertEqual(duration_to_seconds("3h 34m 45s"), 12885)
		self.assertEqual(duration_to_seconds("1h"), 3600)
		self.assertEqual(duration_to_seconds("110m"), 110 * 60)
		self.assertEqual(duration_to_seconds("110m"), 110 * 60)

	def test_format_duration(self):
		self.assertEqual(format_duration(0), "")
		self.assertEqual(format_duration(45.7), "45s")
		self.assertEqual(format_duration(90.9), "1m 30s")
		self.assertEqual(format_duration(3600), "1h")
		self.assertEqual(format_duration("12885"), "3h 34m 45s")
		self.assertEqual(format_duration(86400), "1d")
		self.assertEqual(format_duration(86401), "1d 1s")

		self.assertEqual(format_duration(-45.3), "-45s")
		self.assertEqual(format_duration(-12885), "-3h 34m 45s")

		self.assertEqual(format_duration(86400, hide_days=True), "24h")
		self.assertEqual(format_duration(90061, hide_days=True), "25h 1m 1s")

	def test_get_timespan_date_range(self):
		supported_timespans = [
			"last week",
			"last month",
			"last quarter",
			"last 6 months",
			"last year",
			"yesterday",
			"today",
			"tomorrow",
			"this week",
			"this month",
			"this quarter",
			"this year",
			"next week",
			"next month",
			"next quarter",
			"next 6 months",
			"next year",
		]

		for ts in supported_timespans:
			res = get_timespan_date_range(ts)
			self.assertEqual(len(res), 2)

			self.assertIsInstance(res[0], date)
			self.assertIsInstance(res[1], date)

	def test_timesmap_utils(self):
		self.assertEqual(get_year_ending(date(2021, 1, 1)), date(2021, 12, 31))
		self.assertEqual(get_year_ending(date(2021, 1, 31)), date(2021, 12, 31))

	@given(st.datetimes())
	def test_get_datetime(self, original):
		if is_invalid_date_string(str(original)):
			return
		parsed = get_datetime(str(original))
		self.assertEqual(parsed, original)

	@given(st.datetimes(timezones=st.timezones()))
	def test_get_datetime_tz_aware(self, original):
		if is_invalid_date_string(str(original)):
			return
		parsed = get_datetime(str(original))
		self.assertEqual(parsed.astimezone(UTC), original.astimezone(UTC))

	def test_pretty_date(self):
		from frappe import _

		now = get_datetime()

		test_cases = {
			now: _("1 second ago"),
			add_to_date(now, minutes=-1): _("1 minute ago"),
			add_to_date(now, minutes=-3): _("3 minutes ago"),
			add_to_date(now, hours=-1): _("1 hour ago"),
			add_to_date(now, hours=-2): _("2 hours ago"),
			add_to_date(now, days=-1): _("1 day ago"),
			add_to_date(now, days=-5): _("5 days ago"),
			add_to_date(now, days=-8): _("1 week ago"),
			add_to_date(now, days=-14): _("2 weeks ago"),
			add_to_date(now, days=-32): _("1 month ago"),
			add_to_date(now, days=-32 * 2): _("2 months ago"),
			add_to_date(now, years=-1, days=-5): _("1 year ago"),
			add_to_date(now, years=-2, days=-10): _("2 years ago"),
		}

		for dt, exp_message in test_cases.items():
			self.assertEqual(pretty_date(dt), exp_message)

		self.assertEqual(pretty_date(add_to_date(now, days=-5), mini=True), "5d")

	def test_date_from_timegrain(self):
		start_date = getdate("2021-01-01")

		daily = get_dates_from_timegrain(start_date, add_to_date(start_date, days=6), "Daily")
		self.assertEqual(len(daily), 7)
		for idx, d in enumerate(daily):
			self.assertEqual(d, add_to_date(start_date, days=idx))

		start = get_first_day_of_week(start_date)
		end = add_to_date(add_to_date(start, weeks=52), days=-1)
		weekly = get_dates_from_timegrain(start, end, "Weekly")
		self.assertEqual(len(weekly), 52)
		for idx, d in enumerate(weekly, start=1):
			self.assertEqual(d, add_to_date(start, days=7 * idx - 1))

		quarterly = get_dates_from_timegrain(start_date, add_to_date(start_date, months=5), "Quarterly")
		self.assertEqual(len(quarterly), 2)
		for idx, d in enumerate(quarterly, start=1):
			self.assertEqual(d, add_to_date(start_date, months=idx * 3, days=-1))

		yearly = get_dates_from_timegrain(start_date, add_to_date(start_date, years=2), "Yearly")
		self.assertEqual(len(yearly), 3)
		for idx, d in enumerate(yearly, start=1):
			self.assertEqual(d, add_to_date(start_date, years=idx, days=-1))


class TestResponse(TestCase):
    pass















































class TestTimeDeltaUtils(TestCase):
	def test_format_timedelta(self):
		self.assertEqual(format_timedelta(timedelta(seconds=0)), "0:00:00")
		self.assertEqual(format_timedelta(timedelta(hours=10)), "10:00:00")
		self.assertEqual(format_timedelta(timedelta(hours=100)), "100:00:00")
		self.assertEqual(format_timedelta(timedelta(seconds=100, microseconds=129)), "0:01:40.000129")
		self.assertEqual(
			format_timedelta(timedelta(seconds=100, microseconds=12212199129)),
			"3:25:12.199129",
		)

	def test_parse_timedelta(self):
		self.assertEqual(parse_timedelta("0:0:0"), timedelta(seconds=0))
		self.assertEqual(parse_timedelta("10:0:0"), timedelta(hours=10))
		self.assertEqual(
			parse_timedelta("7 days, 0:32:18.192221"),
			timedelta(days=7, seconds=1938, microseconds=192221),
		)
		self.assertEqual(parse_timedelta("7 days, 0:32:18"), timedelta(days=7, seconds=1938))


class TestXlsxUtils(TestCase):
    pass













































class TestCsvUtils(TestCase):
    pass































































class TestLinkTitle(TestCase):
    pass



























































































































































class TestAppParser(TestCase):
    pass
















class TestIntrospectionMagic(TestCase):
    pass

























class TestMakeRandom(TestCase):
    pass











class TestLazyLoader(TestCase):
    pass












class TestIdenticon(TestCase):
    pass




















class TestContainerUtils(TestCase):
    pass










class TestLocks(TestCase):
    pass















class TestMiscUtils(TestCase):
    pass










































class TestTypingValidations(TestCase):
    pass





















































































class TestTBSanitization(TestCase):
    pass























































































class TestRounding(TestCase):
	"""`flt(value, precision, rounding_method)` supports two tie-breaking rules:

	  - "Commercial Rounding": ties round away from zero  (== Decimal ROUND_HALF_UP)
	  - "Banker's Rounding":   ties round to nearest even  (== Decimal ROUND_HALF_EVEN)

	The exhaustive numeric behaviour is verified against those stdlib oracles in the
	property tests below. The example tests only document the contrast between methods
	and cover behaviour the oracles can't reach (string parsing, invalid input, etc.).
	"""

	def test_flt_parses_strings_and_ignores_invalid_input(self):
		self.assertEqual(flt(None), 0)
		self.assertEqual(flt("what"), 0)
		self.assertEqual(flt("0.3"), 0.3)
		self.assertEqual(flt("1,500.5", 2), 1500.5)

	def test_commercial_rounding_examples(self):
		method = "Commercial Rounding"
		self.assertEqual(flt("0.5", 0, rounding_method=method), 1)
		self.assertEqual(flt(2.5, 0, rounding_method=method), 3)
		self.assertEqual(flt(-0.5, 0, rounding_method=method), -1)
		self.assertEqual(flt(2.675, 2, rounding_method=method), 2.68)

	def test_bankers_rounding_examples(self):
		method = "Banker's Rounding"
		self.assertEqual(rounded(0, 0, rounding_method=method), 0)
		self.assertEqual(rounded(5.551115123125783e-17, 2, rounding_method=method), 0.0)
		self.assertEqual(flt("0.5", 0, rounding_method=method), 0)
		self.assertEqual(flt(2.5, 0, rounding_method=method), 2)
		self.assertEqual(flt(-0.5, 0, rounding_method=method), 0)
		self.assertEqual(flt(2.675, 2, rounding_method=method), 2.68)

	def test_rounding_does_not_inflate_exactly_representable_values(self):
		self.assertEqual(flt(9750000.0, 9, rounding_method="Commercial Rounding"), 9750000.0)
		self.assertEqual(flt(6500000.0, 9, rounding_method="Commercial Rounding"), 6500000.0)
		self.assertEqual(flt(26509905246072.0, 2, rounding_method="Commercial Rounding"), 26509905246072.0)
		self.assertEqual(flt(26509905246072.01, 2, rounding_method="Banker's Rounding"), 26509905246072.01)

	def test_commercial_rounding_breaks_representable_ties_away_from_zero(self):
		method = "Commercial Rounding"
		self.assertEqual(flt(2**50 + 0.5, 0, rounding_method=method), 2**50 + 1)
		self.assertEqual(flt(-(2**50) - 0.5, 0, rounding_method=method), -(2**50) - 1)

	@given(
		st.sampled_from(["Commercial Rounding", "Banker's Rounding"]),
		st.floats(min_value=-1e14, max_value=1e14, allow_nan=False, allow_infinity=False),
		st.integers(min_value=0, max_value=9),
	)
	def test_rounding_is_idempotent(self, rounding_method, number, precision):
		rounded_once = flt(number, precision, rounding_method=rounding_method)
		self.assertEqual(flt(rounded_once, precision, rounding_method=rounding_method), rounded_once)

	@TestCase.change_settings("System Settings", {"rounding_method": "Commercial Rounding"})
	@given(
		st.decimals(min_value=-1e8, max_value=1e8),
		st.integers(min_value=-2, max_value=4),
	)
	def test_commercial_rounding_matches_round_half_up(self, number, precision):
		with localcontext() as ctx:
			ctx.rounding = ROUND_HALF_UP
			self.assertEqual(Decimal(str(flt(float(number), precision))), round(number, precision))

	@TestCase.change_settings("System Settings", {"rounding_method": "Banker's Rounding"})
	@given(
		st.decimals(min_value=-1e8, max_value=1e8),
		st.integers(min_value=-2, max_value=4),
	)
	def test_bankers_rounding_matches_round_half_even(self, number, precision):
		self.assertEqual(Decimal(str(flt(float(number), precision))), round(number, precision))

	@given(
		st.sampled_from(["Commercial Rounding", "Banker's Rounding"]),
		st.floats(min_value=-1e8, max_value=1e8, allow_nan=False, allow_infinity=False),
		st.integers(min_value=-2, max_value=4),
	)
	def test_rounding_is_sign_symmetric(self, rounding_method, number, precision):
		self.assertEqual(
			flt(-number, precision, rounding_method=rounding_method),
			-flt(number, precision, rounding_method=rounding_method),
		)

	def test_default_rounding(self):
		self.assertEqual(frappe.get_system_settings("rounding_method"), "Banker's Rounding")

	@given(
		st.floats(min_value=-(2**32) - 1, max_value=2**32 + 1),
		st.integers(min_value=-(2**63) - 1, max_value=2**63 + 1),
	)
	def test_cint(self, floating_point, integer):
		self.assertEqual(cint(integer), integer)
		self.assertEqual(cint(str(integer)), integer)
		self.assertEqual(cint(str(floating_point)), int(floating_point))


class TestArgumentTypingValidations(TestCase):
    pass




















































class TestChangeLog(TestCase):
    pass




































































class TestCrypto(TestCase):
    pass








class TestURLTrackers(TestCase):
    pass



















































class TestDataUtils(TestCase):
	def setUp(self):
		frappe.local.lang = "en"

	def tearDown(self):
		frappe.local.lang = "en"

	def test_orjson_dumps_fallback_on_large_integers(self):
		def normalize(v):
			return json.loads(v)

		big = 2**63 + 1
		result = orjson_dumps({"big": big})
		self.assertEqual(normalize(result), normalize(json.dumps({"big": big})))

		result_bytes = orjson_dumps({"big": big}, decode=False)
		self.assertIsInstance(result_bytes, bytes)
		self.assertEqual(normalize(result_bytes), normalize(json.dumps({"big": big}).encode()))

	def test_comma_and(self):
		self.assertEqual(comma_and(["a", "b", "c"]), "'a', 'b', and 'c'")
		self.assertEqual(comma_and(["a", "b", "c"], add_quotes=False), "a, b, and c")

		frappe.local.lang = "pt-BR"

		self.assertEqual(comma_and(["a", "b", "c"]), "'a', 'b' e 'c'")
		self.assertEqual(comma_and(["a", "b", "c"], add_quotes=False), "a, b e c")

	def test_comma_or(self):
		self.assertEqual(comma_or(["a", "b", "c"]), "'a', 'b', or 'c'")
		self.assertEqual(comma_or(["a", "b", "c"], add_quotes=False), "a, b, or c")

		frappe.local.lang = "pt-BR"

		self.assertEqual(comma_or(["a", "b", "c"]), "'a', 'b' ou 'c'")
		self.assertEqual(comma_or(["a", "b", "c"], add_quotes=False), "a, b ou c")


class TestMsgPrint(TestCase):
    pass













