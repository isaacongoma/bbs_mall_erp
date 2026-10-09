from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EtimsSlade360IdMappingGenerated(FrappeChildModel):
    doctype = 'eTims Slade360 ID Mapping'
    etims_setup = models.CharField(max_length=140, blank=True, null=True, default='')
    slade360_id = models.CharField(max_length=140, blank=True, null=True, default='')
    is_active = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
