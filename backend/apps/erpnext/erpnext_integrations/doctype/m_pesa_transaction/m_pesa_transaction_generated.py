from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class MPesaTransactionGenerated(FrappeModel):
    doctype = 'M-Pesa Transaction'
    transaction_type = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    receipt_number = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    phone_number = models.CharField(max_length=140, blank=True, null=True, default='')
    bill_ref_number = models.CharField(max_length=140, blank=True, null=True, default='')
    first_name = models.CharField(max_length=140, blank=True, null=True, default='')
    middle_name = models.CharField(max_length=140, blank=True, null=True, default='')
    last_name = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_time = models.DateTimeField(null=True, blank=True)
    merchant_request_id = models.CharField(max_length=140, blank=True, null=True, default='')
    checkout_request_id = models.CharField(max_length=140, blank=True, null=True, default='')
    conversation_id = models.CharField(max_length=140, blank=True, null=True, default='')
    originator_conversation_id = models.CharField(max_length=140, blank=True, null=True, default='')
    result_code = models.CharField(max_length=140, blank=True, null=True, default='')
    result_desc = models.TextField(blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_request = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    raw_payload = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
