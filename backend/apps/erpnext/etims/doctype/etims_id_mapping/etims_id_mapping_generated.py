from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EtimsIdMappingGenerated(FrappeChildModel):
    doctype = 'eTims ID Mapping'
    setup_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    setup_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    etims_id = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
