from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DunningTypeGenerated(FrappeModel):
    doctype = 'Dunning Type'
    dunning_type = models.CharField(max_length=140, blank=True, null=True, default='')
    dunning_fee = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate_of_interest = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_default = models.SmallIntegerField(default=0)
    income_account = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
