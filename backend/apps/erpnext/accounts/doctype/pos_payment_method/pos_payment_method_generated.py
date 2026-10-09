from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PosPaymentMethodGenerated(FrappeChildModel):
    doctype = 'POS Payment Method'
    default = models.SmallIntegerField(default=0)
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    allow_in_returns = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
