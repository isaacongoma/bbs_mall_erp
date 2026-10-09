from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProcessStatementOfAccountsGenerated(FrappeModel):
    doctype = 'Process Statement Of Accounts'
    frequency = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    customer_collection = models.CharField(max_length=140, blank=True, null=True, default='')
    collection_name = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    finance_book = models.CharField(max_length=140, blank=True, null=True, default='')
    orientation = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date = models.DateField(null=True, blank=True)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    include_ageing = models.SmallIntegerField(default=0)
    ageing_based_on = models.CharField(max_length=140, blank=True, null=True, default='Due Date')
    enable_auto_email = models.SmallIntegerField(default=0)
    primary_mandatory = models.SmallIntegerField(default=1)
    filter_duration = models.IntegerField(null=True, blank=True)
    subject = models.CharField(max_length=140, blank=True, null=True, default='')
    body = models.TextField(blank=True, null=True, default='')
    letter_head = models.CharField(max_length=140, blank=True, null=True, default='')
    terms_and_conditions = models.CharField(max_length=140, blank=True, null=True, default='')
    include_break = models.SmallIntegerField(default=1)
    show_net_values_in_party_account = models.SmallIntegerField(default=0)
    sender = models.CharField(max_length=140, blank=True, null=True, default='')
    report = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    payment_terms_template = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_partner = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_person = models.CharField(max_length=140, blank=True, null=True, default='')
    territory = models.CharField(max_length=140, blank=True, null=True, default='')
    based_on_payment_terms = models.SmallIntegerField(default=0)
    pdf_name = models.CharField(max_length=140, blank=True, null=True, default='')
    ignore_exchange_rate_revaluation_journals = models.SmallIntegerField(default=0)
    ignore_cr_dr_notes = models.SmallIntegerField(default=0)
    show_remarks = models.SmallIntegerField(default=0)
    categorize_by = models.CharField(max_length=140, blank=True, null=True, default='Categorize by Voucher (Consolidated)')
    show_future_payments = models.SmallIntegerField(default=0)
    print_format = models.CharField(max_length=140, blank=True, null=True, default='')
    show_opening_entries = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
