from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PaymentRequestGenerated(FrappeModel):
    doctype = 'Payment Request'
    payment_request_type = models.CharField(max_length=140, blank=True, null=True, default='Inward')
    transaction_date = models.DateField(null=True, blank=True)
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_a_subscription = models.SmallIntegerField(default=0)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    bank = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_account_no = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    iban = models.CharField(max_length=140, blank=True, null=True, default='')
    branch_code = models.CharField(max_length=140, blank=True, null=True, default='')
    swift_number = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    print_format = models.CharField(max_length=140, blank=True, null=True, default='')
    email_to = models.CharField(max_length=140, blank=True, null=True, default='')
    subject = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_gateway_account = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    make_sales_invoice = models.SmallIntegerField(default=0)
    message = models.TextField(blank=True, null=True, default='')
    mute_email = models.SmallIntegerField(default=0)
    payment_url = models.CharField(max_length=500, blank=True, null=True, default='')
    payment_gateway = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_account = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_channel = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_order = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    failed_reason = models.CharField(max_length=140, blank=True, null=True, default='')
    outstanding_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    party_account_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    party_name = models.CharField(max_length=140, blank=True, null=True, default='')
    phone_number = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
