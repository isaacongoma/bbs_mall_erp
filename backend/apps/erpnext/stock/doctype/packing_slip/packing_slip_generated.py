from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PackingSlipGenerated(FrappeModel):
    doctype = 'Packing Slip'
    delivery_note = models.CharField(max_length=140, blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    from_case_no = models.IntegerField(null=True, blank=True)
    to_case_no = models.IntegerField(null=True, blank=True)
    net_weight_pkg = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    net_weight_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    gross_weight_pkg = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    gross_weight_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    letter_head = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
