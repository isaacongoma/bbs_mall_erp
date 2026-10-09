from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CsfKeGenerated(FrappeModel):
    doctype = 'CSF KE'
    csf_ke = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
