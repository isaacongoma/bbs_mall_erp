import frappe
from django.test import TestCase as DjangoTestCase

from .unit_test_case import UnitTestCase


class IntegrationTestCase(DjangoTestCase, UnitTestCase):
    @classmethod
    def setUpClass(cls) -> None:
        super().setUpClass()
        frappe.set_user("Administrator")

    def setUp(self) -> None:
        super().setUp()
        frappe.set_user("Administrator")
