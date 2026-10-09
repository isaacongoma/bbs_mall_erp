from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavariKraEtimsPaymentTypeGenerated(FrappeModel):
    doctype = 'Navari KRA eTims Payment Type'
    code = models.CharField(max_length=140, blank=True, null=True, default='')
    sort_order = models.IntegerField(null=True, blank=True)
    account_details = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    settings = models.CharField(max_length=140, blank=True, null=True, default='')
    slade_id = models.CharField(max_length=140, blank=True, null=True, default='')
    code_name = models.CharField(max_length=140, blank=True, null=True, default='')
    code_description = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    active = models.SmallIntegerField(default=0)
    bank_name = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_branch = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_account_number = models.CharField(max_length=140, blank=True, null=True, default='')
    mobile_money_business_number = models.CharField(max_length=140, blank=True, null=True, default='')
    mobile_money_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
