from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalesPartnerGenerated(FrappeModel):
    doctype = 'Sales Partner'
    partner_name = models.CharField(max_length=140, blank=True, null=True, default='')
    partner_type = models.CharField(max_length=140, blank=True, null=True, default='')
    territory = models.CharField(max_length=140, blank=True, null=True, default='')
    commission_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    show_in_website = models.SmallIntegerField(default=0)
    referral_code = models.CharField(max_length=8, blank=True, null=True, default='')
    route = models.CharField(max_length=140, blank=True, null=True, default='')
    logo = models.TextField(blank=True, null=True, default='')
    partner_website = models.CharField(max_length=140, blank=True, null=True, default='')
    introduction = models.TextField(blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
