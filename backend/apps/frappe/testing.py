from contextlib import contextmanager


@contextmanager
def change_settings(doctype, settings_dict=None, /, commit=False, **settings):
    from apps.frappe import runtime

    if settings_dict is None:
        settings_dict = settings
    if doctype != "System Settings":
        yield
        return
    previous = runtime.SYSTEM_SETTINGS_OVERRIDE
    runtime.SYSTEM_SETTINGS_OVERRIDE = {**previous, **settings_dict}
    try:
        yield
    finally:
        runtime.SYSTEM_SETTINGS_OVERRIDE = previous


def install_test_helpers():
    from django.test import TestCase

    if not hasattr(TestCase, "change_settings"):
        TestCase.change_settings = staticmethod(change_settings)

    if not getattr(TestCase, "_frappe_state_reset", False):
        original = TestCase._fixture_setup

        def fixture_setup(self):
            from django.core.cache import cache as django_cache

            from apps.frappe.runtime import _dict, _local

            django_cache.clear()
            _local.set(_dict())
            return original(self)

        TestCase._fixture_setup = fixture_setup
        TestCase._frappe_state_reset = True
