from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CustomIconGenerated(FrappeModel):
    doctype = 'Custom Icon'
    icon_name = models.CharField(max_length=140, blank=True, null=True, default='')
    svg = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
