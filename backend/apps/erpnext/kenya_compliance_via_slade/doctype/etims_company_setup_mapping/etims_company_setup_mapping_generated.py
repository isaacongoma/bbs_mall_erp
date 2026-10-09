from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EtimsCompanySetupMappingGenerated(FrappeChildModel):
    doctype = 'eTims Company Setup Mapping'
    is_active = models.SmallIntegerField(default=1)
    setup_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    organisation = models.CharField(max_length=140, blank=True, null=True, default='')
    cluster = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
