import base64
import json
from datetime import datetime

import requests

HOSTS = {"Sandbox": "https://sandbox.safaricom.co.ke", "Production": "https://api.safaricom.co.ke"}


class DarajaError(Exception):
    def __init__(self, status, payload):
        super().__init__(f"Daraja request failed with HTTP {status}: {payload}")
        self.status = status
        self.payload = payload


def requests_http(method, url, headers=None, json_body=None, auth=None):
    response = requests.request(method, url, headers=headers, json=json_body, auth=auth, timeout=30)
    try:
        payload = response.json()
    except ValueError:
        payload = {"raw": response.text}
    return response.status_code, payload


def timestamp_now():
    return datetime.now().strftime("%Y%m%d%H%M%S")


class DarajaClient:
    def __init__(self, settings, http=requests_http, clock=timestamp_now):
        self.settings = settings
        self.http = http
        self.clock = clock
        self.host = HOSTS[settings.environment or "Sandbox"]
        self._token = None

    def request(self, method, path, body=None, authenticated=True, auth=None):
        headers = {"Content-Type": "application/json"}
        if authenticated:
            headers["Authorization"] = f"Bearer {self.token()}"
        status, payload = self.http(method, self.host + path, headers=headers, json_body=body, auth=auth)
        if status != 200:
            raise DarajaError(status, payload)
        return payload

    def token(self):
        if self._token:
            return self._token
        payload = self.request(
            "GET",
            "/oauth/v1/generate?grant_type=client_credentials",
            authenticated=False,
            auth=(self.settings.consumer_key, self.settings.get_password("consumer_secret")),
        )
        self._token = payload["access_token"]
        return self._token

    def password(self, timestamp):
        raw = f"{self.settings.business_shortcode}{self.settings.get_password('passkey')}{timestamp}"
        return base64.b64encode(raw.encode()).decode()

    def callback_url(self, name):
        base = self.settings.callback_base_url.rstrip("/")
        token = self.settings.get_password("callback_token")
        return f"{base}/api/erpnext/method/erpnext.erpnext_integrations.mpesa.callbacks.{name}/?token={token}"

    def stk_push(self, phone_number, amount, account_reference, description):
        timestamp = self.clock()
        shortcode = self.settings.business_shortcode
        body = {
            "BusinessShortCode": shortcode,
            "Password": self.password(timestamp),
            "Timestamp": timestamp,
            "TransactionType": "CustomerBuyGoodsOnline" if self.settings.till_number else "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone_number,
            "PartyB": self.settings.till_number or shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": self.callback_url("stk_callback"),
            "AccountReference": account_reference,
            "TransactionDesc": description,
        }
        return self.request("POST", "/mpesa/stkpush/v1/processrequest", body)

    def register_c2b_urls(self, response_type="Completed"):
        body = {
            "ShortCode": self.settings.business_shortcode,
            "ResponseType": response_type,
            "ConfirmationURL": self.callback_url("c2b_confirmation"),
            "ValidationURL": self.callback_url("c2b_validation"),
        }
        return self.request("POST", "/mpesa/c2b/v1/registerurl", body)

    def b2c_payment(self, phone_number, amount, remarks, occasion="", command_id="BusinessPayment"):
        body = {
            "InitiatorName": self.settings.initiator_name,
            "SecurityCredential": self.settings.get_password("security_credential"),
            "CommandID": command_id,
            "Amount": int(amount),
            "PartyA": self.settings.business_shortcode,
            "PartyB": phone_number,
            "Remarks": remarks,
            "QueueTimeOutURL": self.callback_url("b2c_timeout"),
            "ResultURL": self.callback_url("b2c_result"),
            "Occasion": occasion,
        }
        return self.request("POST", "/mpesa/b2c/v1/paymentrequest", body)

    def transaction_status(self, transaction_id, remarks="Transaction status", occasion=""):
        body = {
            "Initiator": self.settings.initiator_name,
            "SecurityCredential": self.settings.get_password("security_credential"),
            "CommandID": "TransactionStatusQuery",
            "TransactionID": transaction_id,
            "PartyA": self.settings.business_shortcode,
            "IdentifierType": "4",
            "ResultURL": self.callback_url("status_result"),
            "QueueTimeOutURL": self.callback_url("status_timeout"),
            "Remarks": remarks,
            "Occasion": occasion,
        }
        return self.request("POST", "/mpesa/transactionstatus/v1/query", body)

    def reversal(self, transaction_id, amount, remarks="Reversal", occasion=""):
        body = {
            "Initiator": self.settings.initiator_name,
            "SecurityCredential": self.settings.get_password("security_credential"),
            "CommandID": "TransactionReversal",
            "TransactionID": transaction_id,
            "Amount": int(amount),
            "ReceiverParty": self.settings.business_shortcode,
            "RecieverIdentifierType": "11",
            "ResultURL": self.callback_url("reversal_result"),
            "QueueTimeOutURL": self.callback_url("reversal_timeout"),
            "Remarks": remarks,
            "Occasion": occasion,
        }
        return self.request("POST", "/mpesa/reversal/v1/request", body)


def dumps(payload):
    return json.dumps(payload, separators=(",", ":"), sort_keys=True)
