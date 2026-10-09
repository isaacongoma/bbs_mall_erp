from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SecuritySettingsContactGenerated(FrappeChildModel):
    doctype = 'Security Settings Contact'
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    contact = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
