from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class InstallationNoteItemGenerated(FrappeChildModel):
    doctype = 'Installation Note Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    serial_no = models.TextField(blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    prevdoc_detail_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    prevdoc_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    prevdoc_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    serial_and_batch_bundle = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
