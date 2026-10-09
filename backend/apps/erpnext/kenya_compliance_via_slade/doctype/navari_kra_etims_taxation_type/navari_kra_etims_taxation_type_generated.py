from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavariKraEtimsTaxationTypeGenerated(FrappeModel):
    doctype = 'Navari KRA eTims Taxation Type'
    cd = models.CharField(max_length=140, blank=True, null=True, default='')
    slade_id = models.CharField(max_length=140, blank=True, null=True, default='')
    cdnm = models.CharField(max_length=140, blank=True, null=True, default='')
    cddesc = models.CharField(max_length=140, blank=True, null=True, default='')
    srtord = models.IntegerField(null=True, blank=True)
    useyn = models.SmallIntegerField(default=1)
    cdclsnm = models.CharField(max_length=140, blank=True, null=True, default='04')
    userdfncd1 = models.CharField(max_length=140, blank=True, null=True, default='')
    userdfncd2 = models.CharField(max_length=140, blank=True, null=True, default='')
    userdfncd3 = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
