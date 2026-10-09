from hypothesis import settings

settings.register_profile("bbs_erp", deadline=None)
settings.load_profile("bbs_erp")

from apps.frappe.tests.classes import IntegrationTestCase, UnitTestCase
from apps.frappe.tests.classes.context_managers import *
