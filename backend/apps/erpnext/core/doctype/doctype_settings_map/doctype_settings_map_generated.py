from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DoctypeSettingsMapGenerated(FrappeModel):
    doctype = 'DocType Settings Map'
    applies_to_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    is_standard = models.SmallIntegerField(default=0)
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    is_active = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
