from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ExchangeRateRevaluationGenerated(FrappeModel):
    doctype = 'Exchange Rate Revaluation'
    posting_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    gain_loss_unbooked = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    gain_loss_booked = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_gain_loss = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rounding_loss_allowance = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
