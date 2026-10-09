from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EtimsTaxationTypeGenerated(FrappeModel):
    doctype = 'eTims Taxation Type'
    cd = models.CharField(max_length=140, blank=True, null=True, default='')
    cdnm = models.CharField(max_length=140, blank=True, null=True, default='')
    cddesc = models.CharField(max_length=140, blank=True, null=True, default='')
    srtord = models.IntegerField(null=True, blank=True)
    useyn = models.SmallIntegerField(default=1)
    percentage = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount_type = models.CharField(max_length=140, blank=True, null=True, default='')
    cdclsnm = models.CharField(max_length=140, blank=True, null=True, default='04')
    userdfncd1 = models.CharField(max_length=140, blank=True, null=True, default='')
    userdfncd2 = models.CharField(max_length=140, blank=True, null=True, default='')
    userdfncd3 = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
