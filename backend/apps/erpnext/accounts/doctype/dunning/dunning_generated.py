from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DunningGenerated(FrappeModel):
    doctype = 'Dunning'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='DUNN-.MM.-.YY.-')
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    dunning_type = models.CharField(max_length=140, blank=True, null=True, default='')
    dunning_fee = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    language = models.CharField(max_length=140, blank=True, null=True, default='')
    letter_head = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    body_text = models.TextField(blank=True, null=True, default='')
    closing_text = models.TextField(blank=True, null=True, default='')
    posting_time = models.TimeField(null=True, blank=True)
    rate_of_interest = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    address_display = models.TextField(blank=True, null=True, default='')
    contact_display = models.TextField(blank=True, null=True, default='')
    contact_mobile = models.TextField(blank=True, null=True, default='')
    company_address_display = models.TextField(blank=True, null=True, default='')
    contact_email = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Unresolved')
    income_account = models.CharField(max_length=140, blank=True, null=True, default='')
    total_interest = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_outstanding = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    customer_address = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_person = models.CharField(max_length=140, blank=True, null=True, default='')
    dunning_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    spacer = models.CharField(max_length=140, blank=True, null=True, default='')
    company_address = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_dunning_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
