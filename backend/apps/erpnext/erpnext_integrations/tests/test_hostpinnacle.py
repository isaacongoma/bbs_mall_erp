import json
from urllib.parse import urlparse

from django.test import TestCase

import frappe
from apps.erpnext.erpnext_integrations.hostpinnacle import sms
from apps.frappe.core.doctype.sms_settings.sms_settings import _send_sms
from apps.frappe.runtime import session

SEND_OK = {"response": {"api": "send", "action": "send", "status": "success", "msgid": "1234"}}
BALANCE = {"response": {"api": "account", "action": "readstatus", "account": {"smsBalance": "250"}}}


class FakeGateway:
    def __init__(self, send_status=200, send_body=None, balance_body=None):
        self.calls = []
        self.send_status = send_status
        self.send_body = SEND_OK if send_body is None else send_body
        self.balance_body = BALANCE if balance_body is None else balance_body

    def __call__(self, url, data):
        self.calls.append((urlparse(url).path, data))
        if url.endswith("/send"):
            return self.send_status, json.dumps(self.send_body)
        return 200, json.dumps(self.balance_body)


class HostPinnacleTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        self.addCleanup(sms.HTTP.update, {"call": sms.HTTP["call"]})
        settings = frappe.get_doc("HostPinnacle Settings")
        settings.update(
            {
                "enabled": 1,
                "user_id": "bbsuser",
                "password": "s3cret",
                "sender_id": "BBSERP",
                "api_base_url": "https://smsportal.hostpinnacle.co.ke/SMSApi",
                "sms_balance": 100,
                "minimum_balance": 1,
            }
        )
        settings.save()
        self.gateway = FakeGateway()
        sms.HTTP["call"] = self.gateway

    def test_phone_formatting(self):
        self.assertEqual(sms.format_phone("0712345678"), "254712345678")
        self.assertEqual(sms.format_phone("+254 712-345-678"), "254712345678")
        self.assertEqual(sms.format_phone("712345678"), "254712345678")
        self.assertIsNone(sms.format_phone("12345"))
        self.assertIsNone(sms.format_phone(None))
        self.assertEqual(sms.normalize_recipients("0712345678, 0722000111,bad"), ["254712345678", "254722000111"])

    def test_message_is_reduced_to_ascii(self):
        self.assertEqual(sms.sanitize_message("It’s “due” – now… é"), "It's \"due\" - now... ")

    def test_send_request_body_and_log(self):
        result = _send_sms(["0712345678", "0722000111"], "Rent – due", "Accounts", False)
        self.assertEqual(result, SEND_OK)
        path, data = self.gateway.calls[0]
        self.assertEqual(path, "/SMSApi/send")
        self.assertEqual(
            data,
            {
                "userid": "bbsuser",
                "password": "s3cret",
                "senderid": "BBSERP",
                "sendMethod": "quick",
                "msgType": "text",
                "output": "json",
                "duplicatecheck": "false",
                "msg": "Rent - due",
                "mobile": "254712345678,254722000111",
            },
        )
        log = frappe.get_doc("SMS Log", frappe.get_all("SMS Log", pluck="name")[0])
        self.assertEqual(
            (log.sender_name, log.message, log.no_of_requested_sms, log.no_of_sent_sms, log.sent_to),
            ("Accounts", "Rent - due", 2, 2, "254712345678\n254722000111"),
        )

    def test_balance_is_refreshed_after_send(self):
        sms.send_sms("0712345678", "Hello", success_msg=False)
        self.assertEqual(self.gateway.calls[1][0], "/SMSApi/account/readstatus")
        self.assertEqual(self.gateway.calls[1][1], {"userid": "bbsuser", "password": "s3cret", "output": "json"})
        self.assertEqual(frappe.get_doc("HostPinnacle Settings").sms_balance, 250)

    def test_disabled_low_balance_and_invalid_numbers_do_not_send(self):
        settings = frappe.get_doc("HostPinnacle Settings")
        settings.sms_balance = 0
        settings.save()
        self.assertFalse(sms.send_sms("0712345678", "Hello"))
        settings.sms_balance = 100
        settings.enabled = 0
        settings.save()
        self.assertFalse(sms.send_sms("0712345678", "Hello"))
        settings.enabled = 1
        settings.save()
        self.assertFalse(sms.send_sms("123", "Hello"))
        self.assertEqual(self.gateway.calls, [])
        self.assertFalse(frappe.get_all("SMS Log"))

    def test_http_error_and_rejected_response_are_failures(self):
        sms.HTTP["call"] = FakeGateway(send_status=500)
        self.assertFalse(sms.send_sms("0712345678", "Hello", success_msg=False))
        sms.HTTP["call"] = FakeGateway(send_body={"response": {"status": "error", "msg": "bad credentials"}})
        self.assertFalse(sms.send_sms("0712345678", "Hello", success_msg=False))
        self.assertFalse(frappe.get_all("SMS Log"))

    def test_refresh_balance_ignores_unparseable_response(self):
        sms.HTTP["call"] = FakeGateway(balance_body={"unexpected": True})
        self.assertIsNone(sms.refresh_balance())
        self.assertEqual(frappe.get_doc("HostPinnacle Settings").sms_balance, 100)

    def test_hooks_are_registered(self):
        self.assertIn("erpnext.erpnext_integrations.hostpinnacle.sms.send_sms", frappe.get_hooks("send_sms"))
        self.assertIn(
            "erpnext.erpnext_integrations.hostpinnacle.sms.refresh_balance",
            frappe.get_hooks("scheduler_events")["hourly"],
        )
