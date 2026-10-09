from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PosClosingEntryGenerated(FrappeModel):
    doctype = 'POS Closing Entry'
    period_start_date = FrappeDateTimeField(null=True, blank=True)
    period_end_date = FrappeDateTimeField(null=True, blank=True)
    posting_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    pos_profile = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    net_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_quantity = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    pos_opening_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    error_message = models.TextField(blank=True, null=True, default='')
    posting_time = FrappeTimeField(null=True, blank=True)
    total_taxes_and_charges = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
