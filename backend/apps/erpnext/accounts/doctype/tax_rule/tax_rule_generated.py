from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TaxRuleGenerated(FrappeModel):
    doctype = 'Tax Rule'
    tax_type = models.CharField(max_length=140, blank=True, null=True, default='Sales')
    use_for_shopping_cart = models.SmallIntegerField(default=1)
    sales_tax_template = models.CharField(max_length=140, blank=True, null=True, default='')
    purchase_tax_template = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    item = models.CharField(max_length=140, blank=True, null=True, default='')
    billing_city = models.CharField(max_length=140, blank=True, null=True, default='')
    billing_county = models.CharField(max_length=140, blank=True, null=True, default='')
    billing_state = models.CharField(max_length=140, blank=True, null=True, default='')
    billing_zipcode = models.CharField(max_length=140, blank=True, null=True, default='')
    billing_country = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_category = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_group = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_group = models.CharField(max_length=140, blank=True, null=True, default='')
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    shipping_city = models.CharField(max_length=140, blank=True, null=True, default='')
    shipping_county = models.CharField(max_length=140, blank=True, null=True, default='')
    shipping_state = models.CharField(max_length=140, blank=True, null=True, default='')
    shipping_zipcode = models.CharField(max_length=140, blank=True, null=True, default='')
    shipping_country = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    priority = models.IntegerField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
