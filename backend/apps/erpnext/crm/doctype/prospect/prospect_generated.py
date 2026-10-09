from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProspectGenerated(FrappeModel):
    doctype = 'Prospect'
    company_name = models.CharField(max_length=140, blank=True, null=True, default='')
    industry = models.CharField(max_length=140, blank=True, null=True, default='')
    market_segment = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_group = models.CharField(max_length=140, blank=True, null=True, default='')
    territory = models.CharField(max_length=140, blank=True, null=True, default='')
    no_of_employees = models.CharField(max_length=140, blank=True, null=True, default='')
    annual_revenue = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    fax = models.CharField(max_length=140, blank=True, null=True, default='')
    website = models.CharField(max_length=140, blank=True, null=True, default='')
    prospect_owner = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
