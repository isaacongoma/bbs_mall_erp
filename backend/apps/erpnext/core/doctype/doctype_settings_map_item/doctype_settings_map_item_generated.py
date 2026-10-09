from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DoctypeSettingsMapItemGenerated(FrappeChildModel):
    doctype = 'DocType Settings Map Item'
    settings_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    setting_field = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
