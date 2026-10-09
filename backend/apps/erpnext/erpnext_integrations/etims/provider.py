from abc import ABC, abstractmethod


class EtimsError(Exception):
    def __init__(self, message, code=None, response=None):
        super().__init__(message)
        self.code = code
        self.response = response


class EtimsProvider(ABC):
    @abstractmethod
    def initialize_device(self):
        ...

    @abstractmethod
    def fetch_code_lists(self, last_request_date="20200101000000"):
        ...

    @abstractmethod
    def fetch_item_classifications(self, last_request_date="20230101000000"):
        ...

    @abstractmethod
    def register_item(self, payload):
        ...

    @abstractmethod
    def submit_sales_invoice(self, payload):
        ...

    @abstractmethod
    def submit_credit_note(self, payload):
        ...

    @abstractmethod
    def submit_purchase(self, payload):
        ...

    @abstractmethod
    def submit_stock_movement(self, payload):
        ...

    @abstractmethod
    def submit_stock_master(self, payload):
        ...

    @abstractmethod
    def receipt_qr_url(self, tin, branch_id, receipt_signature):
        ...
