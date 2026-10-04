from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SupplierGenerated(FrappeModel):
    doctype = 'Supplier'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_name = models.CharField(max_length=140, blank=True, null=True, default='')
    country = models.CharField(max_length=140, blank=True, null=True, default='')
    default_bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_id = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_category = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_withholding_category = models.CharField(max_length=140, blank=True, null=True, default='')
    is_transporter = models.SmallIntegerField(default=0)
    is_internal_supplier = models.SmallIntegerField(default=0)
    represents_company = models.CharField(max_length=140, blank=True, null=True, default='')
    image = models.TextField(blank=True, null=True, default='')
    supplier_group = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_type = models.CharField(max_length=140, blank=True, null=True, default='Company')
    language = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    warn_rfqs = models.SmallIntegerField(default=0)
    warn_pos = models.SmallIntegerField(default=0)
    prevent_rfqs = models.SmallIntegerField(default=0)
    prevent_pos = models.SmallIntegerField(default=0)
    default_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    default_price_list = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_terms = models.CharField(max_length=140, blank=True, null=True, default='')
    on_hold = models.SmallIntegerField(default=0)
    hold_type = models.CharField(max_length=140, blank=True, null=True, default='All')
    release_date = models.DateField(null=True, blank=True)
    website = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_details = models.TextField(blank=True, null=True, default='')
    is_frozen = models.SmallIntegerField(default=0)
    allow_purchase_invoice_creation_without_purchase_order = models.SmallIntegerField(default=0)
    allow_purchase_invoice_creation_without_purchase_receipt = models.SmallIntegerField(default=0)
    supplier_primary_contact = models.CharField(max_length=140, blank=True, null=True, default='')
    mobile_no = models.CharField(max_length=140, blank=True, null=True, default='')
    email_id = models.CharField(max_length=140, blank=True, null=True, default='')
    primary_address = models.TextField(blank=True, null=True, default='')
    supplier_primary_address = models.CharField(max_length=140, blank=True, null=True, default='')
    restrict_to_companies = models.SmallIntegerField(default=0)
    tax_withholding_group = models.CharField(max_length=140, blank=True, null=True, default='')
    gender = models.CharField(max_length=140, blank=True, null=True, default='')
    alias = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
