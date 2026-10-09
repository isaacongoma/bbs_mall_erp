from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class RequestForQuotationGenerated(FrappeModel):
    doctype = 'Request for Quotation'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    vendor = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_date = models.DateField(null=True, blank=True)
    email_template = models.CharField(max_length=140, blank=True, null=True, default='')
    message_for_supplier = models.TextField(blank=True, null=True, default='Please supply the specified items at the best possible rates')
    tc_name = models.CharField(max_length=140, blank=True, null=True, default='')
    terms = models.TextField(blank=True, null=True, default='')
    select_print_heading = models.CharField(max_length=140, blank=True, null=True, default='')
    letter_head = models.CharField(max_length=140, blank=True, null=True, default='')
    opportunity = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    schedule_date = models.DateField(null=True, blank=True)
    incoterm = models.CharField(max_length=140, blank=True, null=True, default='')
    named_place = models.CharField(max_length=140, blank=True, null=True, default='')
    send_attached_files = models.SmallIntegerField(default=1)
    send_document_print = models.SmallIntegerField(default=0)
    billing_address = models.CharField(max_length=140, blank=True, null=True, default='')
    billing_address_display = models.TextField(blank=True, null=True, default='')
    has_unit_price_items = models.SmallIntegerField(default=0)
    subject = models.CharField(max_length=140, blank=True, null=True, default='Request for Quotation')
    mfs_html = models.TextField(blank=True, null=True, default='')
    use_html = models.SmallIntegerField(default=0)
    shipping_address = models.CharField(max_length=140, blank=True, null=True, default='')
    shipping_address_display = models.TextField(blank=True, null=True, default='')
    title = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
