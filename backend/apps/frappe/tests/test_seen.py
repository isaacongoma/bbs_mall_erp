import json

import frappe
from frappe.tests import IntegrationTestCase


class TestSeen(IntegrationTestCase):
    def tearDown(self):
        frappe.set_user("Administrator")

    def test_if_user_is_added(self):
        ev = frappe.get_doc(
            {
                "doctype": "Event",
                "subject": "test event for seen",
                "starts_on": "2016-01-01 10:10:00",
                "event_type": "Public",
            }
        ).insert()

        frappe.set_user("test@example.com")

        from frappe.desk.form.load import getdoc

        getdoc("Event", ev.name)

        ev = frappe.get_doc("Event", ev.name)

        self.assertTrue("test@example.com" in json.loads(ev._seen))

        frappe.set_user("test1@example.com")

        getdoc("Event", ev.name)

        ev = frappe.get_doc("Event", ev.name)

        self.assertTrue("test@example.com" in json.loads(ev._seen))
        self.assertTrue("test1@example.com" in json.loads(ev._seen))

        ev.save(ignore_permissions=True)
        ev = frappe.get_doc("Event", ev.name)

        self.assertFalse("test@example.com" in json.loads(ev._seen))
        self.assertTrue("test1@example.com" in json.loads(ev._seen))
