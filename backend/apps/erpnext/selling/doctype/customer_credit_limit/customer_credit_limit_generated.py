from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CustomerCreditLimitGenerated(FrappeChildModel):
    doctype = 'Customer Credit Limit'
    credit_limit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    overdue_billing_threshold = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    bypass_credit_limit_check = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
