from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AccountingDimensionDetailGenerated(FrappeChildModel):
    doctype = 'Accounting Dimension Detail'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_document = models.CharField(max_length=140, blank=True, null=True, default='')
    default_dimension = models.CharField(max_length=140, blank=True, null=True, default='')
    mandatory_for_bs = models.SmallIntegerField(default=0)
    mandatory_for_pl = models.SmallIntegerField(default=0)
    automatically_post_balancing_accounting_entry = models.SmallIntegerField(default=0)
    offsetting_account = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
