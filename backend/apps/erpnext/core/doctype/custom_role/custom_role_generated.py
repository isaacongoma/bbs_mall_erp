from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CustomRoleGenerated(FrappeModel):
    doctype = 'Custom Role'
    page = models.CharField(max_length=140, blank=True, null=True, default='')
    report = models.CharField(max_length=140, blank=True, null=True, default='')
    ref_doctype = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
