from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PosOpeningEntryDetailGenerated(FrappeChildModel):
    doctype = 'POS Opening Entry Detail'
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    opening_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
