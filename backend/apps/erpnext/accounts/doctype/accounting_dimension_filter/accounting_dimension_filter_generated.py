from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AccountingDimensionFilterGenerated(FrappeModel):
    doctype = 'Accounting Dimension Filter'
    accounting_dimension = models.CharField(max_length=140, blank=True, null=True, default='')
    allow_or_restrict = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    apply_restriction_on_values = models.SmallIntegerField(default=1)
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
