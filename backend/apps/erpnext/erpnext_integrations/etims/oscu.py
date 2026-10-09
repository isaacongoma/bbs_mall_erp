import requests

from erpnext.erpnext_integrations.etims.provider import EtimsError, EtimsProvider

ROUTES = {
    "DeviceVerificationReq": "/selectInitOsdcInfo",
    "CodeSearchReq": "/selectCodeList",
    "ItemClsSearchReq": "/selectItemClsList",
    "ItemSaveReq": "/saveItem",
    "TrnsSalesSaveWrReq": "/saveTrnsSalesOsdc",
    "TrnsPurchaseSaveReq": "/insertTrnsPurchase",
    "StockIOSaveReq": "/insertStockIO",
    "StockMasterSaveReq": "/saveStockMaster",
}

QR_HOSTS = {
    "Sandbox": "https://etims-sbx.kra.go.ke",
    "Production": "https://etims.kra.go.ke",
}


def requests_post(url, json_body, headers):
    response = requests.post(url, json=json_body, headers=headers, timeout=60)
    return response.status_code, response.json()


class OscuProvider(EtimsProvider):
    def __init__(self, settings, http=requests_post):
        self.settings = settings
        self.http = http

    def headers(self):
        return {
            "tin": self.settings.tin,
            "bhfId": self.settings.branch_id,
            "cmcKey": self.settings.get_password("communication_key", raise_exception=False) or "",
            "Content-Type": "application/json",
        }

    def post(self, route, payload, authenticated=True):
        url = self.settings.server_url.rstrip("/") + ROUTES[route]
        headers = self.headers() if authenticated else {"Content-Type": "application/json"}
        status, body = self.http(url, payload, headers)
        if status != 200:
            raise EtimsError(f"eTIMS HTTP {status}", code=str(status), response=body)
        if body.get("resultCd") != "000":
            raise EtimsError(body.get("resultMsg") or "eTIMS request failed", code=body.get("resultCd"), response=body)
        return body

    def initialize_device(self):
        return self.post(
            "DeviceVerificationReq",
            {"tin": self.settings.tin, "bhfId": self.settings.branch_id, "dvcSrlNo": self.settings.device_serial_number},
            authenticated=False,
        )

    def fetch_code_lists(self, last_request_date="20200101000000"):
        return self.post("CodeSearchReq", {"lastReqDt": last_request_date})

    def fetch_item_classifications(self, last_request_date="20230101000000"):
        return self.post("ItemClsSearchReq", {"lastReqDt": last_request_date})

    def register_item(self, payload):
        return self.post("ItemSaveReq", payload)

    def submit_sales_invoice(self, payload):
        return self.post("TrnsSalesSaveWrReq", payload)

    def submit_credit_note(self, payload):
        return self.post("TrnsSalesSaveWrReq", payload)

    def submit_purchase(self, payload):
        return self.post("TrnsPurchaseSaveReq", payload)

    def submit_stock_movement(self, payload):
        return self.post("StockIOSaveReq", payload)

    def submit_stock_master(self, payload):
        return self.post("StockMasterSaveReq", payload)

    def receipt_qr_url(self, tin, branch_id, receipt_signature):
        host = QR_HOSTS[self.settings.environment or "Sandbox"]
        return f"{host}/common/link/etims/receipt/indexEtimsReceiptData?Data={tin}{branch_id}{receipt_signature}"
