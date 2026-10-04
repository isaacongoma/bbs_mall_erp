from __future__ import annotations

import copy
from contextlib import contextmanager
from django.test import TestCase

import frappe
from apps.frappe.runtime import session


def ensure_test_fixtures():
    from apps.core.models import User
    User.objects.get_or_create(email="Administrator", defaults={"username": "Administrator", "first_name": "Administrator"})

    for user_type in ("System User", "Website User"):
        if not frappe.db.exists("User Type", user_type):
            try:
                frappe.get_doc({
                    "doctype": "User Type",
                    "name": user_type,
                    "user_type": user_type,
                    "is_standard": 1,
                }).insert(ignore_permissions=True)
            except Exception:
                pass

    for role in ("Employee", "Projects User", "System Manager"):
        if not frappe.db.exists("Role", role):
            try:
                frappe.get_doc({
                    "doctype": "Role",
                    "role_name": role,
                    "name": role,
                }).insert(ignore_permissions=True)
            except Exception:
                pass

    if not frappe.db.exists("Company", "_Test Company"):
        try:
            doc = frappe.get_doc({
                "doctype": "Company",
                "company_name": "_Test Company",
                "abbr": "_TC",
                "default_currency": "INR",
                "country": "India",
            })
            doc.insert(ignore_permissions=True)
        except Exception:
            pass

    if not frappe.db.exists("Activity Type", "_Test Activity Type"):
        try:
            frappe.get_doc({
                "doctype": "Activity Type",
                "activity_type": "_Test Activity Type",
            }).insert(ignore_permissions=True)
        except Exception:
            pass

    if not frappe.db.exists("Activity Type", "_Test Activity Type 1"):
        try:
            frappe.get_doc({
                "doctype": "Activity Type",
                "activity_type": "_Test Activity Type 1",
            }).insert(ignore_permissions=True)
        except Exception:
            pass

    if not frappe.db.exists("Employee", {"first_name": "_Test Employee"}):
        try:
            frappe.get_doc({
                "doctype": "Employee",
                "first_name": "_Test Employee",
                "employee_name": "_Test Employee",
                "company": "_Test Company",
                "status": "Active",
                "date_of_birth": "1980-01-01",
                "date_of_joining": "2010-01-01",
                "gender": "Female",
            }).insert(ignore_permissions=True)
        except Exception:
            pass

    if not frappe.db.exists("Project", {"project_name": "_Test Project"}):
        try:
            frappe.get_doc({
                "doctype": "Project",
                "project_name": "_Test Project",
                "company": "_Test Company",
                "status": "Open",
            }).insert(ignore_permissions=True)
        except Exception:
            pass


class ERPNextTestSuite(TestCase):
    @classmethod
    def registerAs(cls, _as):
        def decorator(cm_func):
            setattr(cls, cm_func.__name__, _as(cm_func))
            return cm_func
        return decorator

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.globalTestRecords = {}

    def setUp(self):
        super().setUp()
        session.user = "Administrator"
        if hasattr(frappe, "set_user"):
            frappe.set_user("Administrator")
        ensure_test_fixtures()

    def tearDown(self):
        super().tearDown()
        if hasattr(frappe, "local"):
            if hasattr(frappe.local, "request_cache"):
                frappe.local.request_cache.clear()
            if hasattr(frappe.local, "future_sle"):
                frappe.local.future_sle.clear()
        session.user = "Administrator"

    def load_test_records(self, doctype):
        pass

    @contextmanager
    def set_user(self, user: str):
        try:
            old_user = getattr(frappe.session, "user", "Administrator")
            if hasattr(frappe, "set_user"):
                frappe.set_user(user)
            else:
                session.user = user
            yield
        finally:
            if hasattr(frappe, "set_user"):
                frappe.set_user(old_user)
            else:
                session.user = old_user


@ERPNextTestSuite.registerAs(staticmethod)
@contextmanager
def change_settings(doctype, settings_dict=None, /, **settings) -> None:
    if settings_dict is None:
        settings_dict = settings

    doc_settings = frappe.get_doc(doctype)
    previous_settings = copy.deepcopy(settings_dict)
    for key in previous_settings:
        previous_settings[key] = getattr(doc_settings, key)

    for key, value in settings_dict.items():
        setattr(doc_settings, key, value)
    doc_settings.save(ignore_permissions=True)

    yield

    doc_settings = frappe.get_doc(doctype)
    for key, value in previous_settings.items():
        setattr(doc_settings, key, value)
    doc_settings.save(ignore_permissions=True)


def make_sales_order(**args):
    so = frappe.new_doc("Sales Order")
    args = frappe._dict(args)
    if args.transaction_date:
        so.transaction_date = args.transaction_date

    so.company = args.company or "_Test Company"
    so.customer = args.customer or "_Test Customer"
    so.currency = args.currency or "INR"
    so.po_no = args.po_no or ""
    so.is_subcontracted = args.is_subcontracted or 0
    if args.selling_price_list:
        so.selling_price_list = args.selling_price_list

    if "warehouse" not in args:
        args.warehouse = "_Test Warehouse - _TC"

    if args.item_list:
        for item in args.item_list:
            so.append("items", item)
    else:
        so.append(
            "items",
            {
                "item_code": args.item or args.item_code or "_Test Item",
                "warehouse": args.warehouse,
                "qty": args.qty if args.qty is not None else 10,
                "uom": args.uom or None,
                "price_list_rate": args.price_list_rate or None,
                "discount_percentage": args.discount_percentage or None,
                "rate": args.rate or (None if args.price_list_rate else 100),
                "against_blanket_order": args.against_blanket_order,
            },
        )

    so.delivery_date = frappe.utils.add_days(so.transaction_date or frappe.utils.nowdate(), 10)
    if not args.do_not_save:
        so.insert()
    return so


def create_sales_invoice(**args):
    si = frappe.new_doc("Sales Invoice")
    args = frappe._dict(args)
    if args.posting_date:
        si.set_posting_time = 1
    si.posting_date = args.posting_date or frappe.utils.nowdate()
    si.company = args.company or "_Test Company"
    si.customer = args.customer or "_Test Customer"
    si.currency = args.currency or "INR"
    si.conversion_rate = args.conversion_rate or 1
    si.append(
        "items",
        {
            "item_code": args.item or args.item_code or "_Test Item",
            "item_name": args.item_name or "_Test Item",
            "description": args.description or "_Test Item",
            "qty": args.qty if args.qty is not None else 1,
            "uom": args.uom or "Nos",
            "stock_uom": args.uom or "Nos",
            "rate": args.rate if args.get("rate") is not None else 100,
            "income_account": args.income_account or "Sales - _TC",
        },
    )
    if not args.do_not_save:
        si.insert()
        if args.submit:
            si.submit()
    return si

