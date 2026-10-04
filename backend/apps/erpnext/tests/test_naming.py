import datetime
import time
import re

from django.test import TestCase
from django.utils import timezone

from apps.frappe import new_doc
from apps.frappe import exceptions
from apps.frappe.model.naming import (
    getseries,
    make_autoname,
    _format_autoname,
    parse_naming_series,
    revert_series_if_last,
    BRACED_PARAMS_PATTERN
)
from apps.frappe.models import Series

class TestNaming(TestCase):
    def test_getseries(self):
        key = "atomic-series-"
        self.assertEqual(getseries(key, 5), "00001")
        self.assertEqual(getseries(key, 5), "00002")
        self.assertEqual(Series.objects.get(name=key).current, 2)

    def test_format_autoname(self):
        doc = new_doc("Branch")
        doc.branch = "Format"
        name = _format_autoname("format:TODO-{MM}-{branch}-{##}", doc=doc)
        month = timezone.now().strftime('%m')
        self.assertEqual(name, f"TODO-{month}-Format-01")

    def test_format_autoname_for_datetime_field(self):
        doc = new_doc("Branch")
        now_dt = timezone.now()
        doc.creation = now_dt
        name = _format_autoname("format:TODO-{creation}-{##}", doc=doc)
        self.assertEqual(name, f"TODO-{now_dt}-01")

    def test_expression_autoname_multiple_fields_pattern_without_dot_before_dash(self):
        doc = new_doc("Branch")
        doc.branch = "Sumit"
        doc.modified_by = "Jain"
        
        def get_param_value_for_match(match):
            param = match.group()
            return parse_naming_series([param[1:-1]], doc=doc)
            
        autoname = "{branch}-{modified_by}-.#####"
        name_with_params = BRACED_PARAMS_PATTERN.sub(get_param_value_for_match, autoname)
        normalized_autoname = re.sub(r"(?<!\.)(-\.#+)", r".\1", name_with_params)
        
        name = make_autoname(normalized_autoname, doc=doc)
        self.assertEqual(name, f"Sumit-Jain-00001")

    def test_revert_series(self):
        year = timezone.now().strftime("%Y")
        
        series = f"TEST-{year}-"
        key = "TEST-.YYYY.-"
        name = f"TEST-{year}-00001"
        Series.objects.create(name=series, current=1)
        revert_series_if_last(key, name)
        self.assertEqual(Series.objects.get(name=series).current, 0)
        
        series = f"TEST-{year}-"
        key = "TEST-.YYYY.-.#####"
        name = f"TEST-{year}-00002"
        Series.objects.update_or_create(name=series, defaults={"current": 2})
        revert_series_if_last(key, name)
        self.assertEqual(Series.objects.get(name=series).current, 1)

        series = "TEST-"
        key = "TEST-"
        name = "TEST-00003"
        Series.objects.update_or_create(name=series, defaults={"current": 3})
        revert_series_if_last(key, name)
        self.assertEqual(Series.objects.get(name=series).current, 2)

        series = "TEST1-"
        key = "TEST1-.#####.-2021-22"
        name = "TEST1-00003-2021-22"
        Series.objects.update_or_create(name=series, defaults={"current": 3})
        revert_series_if_last(key, name)
        self.assertEqual(Series.objects.get(name=series).current, 2)

        series = ""
        key = ".#####.-2021-22"
        name = "00003-2021-22"
        Series.objects.update_or_create(name=series, defaults={"current": 3})
        revert_series_if_last(key, name)
        self.assertEqual(Series.objects.get(name=series).current, 2)

    def test_revert_series_date_based_cross_date(self):
        key = "PO-.YYYY.-.MM.-.DD.-.###"
        series = "PO-2020-01-01-"
        name = "PO-2020-01-01-005"
        Series.objects.update_or_create(name=series, defaults={"current": 5})
        revert_series_if_last(key, name)
        self.assertEqual(Series.objects.get(name=series).current, 4)

    def test_naming_series_validation(self):
        valid = ["SINV-", "SI-.{field}.", "SI-#.###", ""]
        invalid = ["$INV-", r"WINDOWS\NAMING"]

        for series in valid:
            if series.strip():
                try:
                    make_autoname(series)
                except Exception as e:
                    self.fail(f"{series} should be valid\n{e}")

        for series in invalid:
            with self.assertRaises(exceptions.ValidationError):
                make_autoname(series)

    def test_naming_with_empty_part(self):
        doc = new_doc("Branch")
        doc.branch = "on_update"
        series = "KOOH-..{branch}.-.####"
        name = parse_naming_series(series, doc=doc)
        self.assertTrue(name.startswith("KOOH-on_update"), f"incorrect name generated {name}")

    def test_hash_naming_is_roughly_sequential(self):
        names = []
        for _ in range(5):
            time.sleep(0.1)
            names.append(make_autoname("hash"))
        self.assertEqual(names, sorted(names))
