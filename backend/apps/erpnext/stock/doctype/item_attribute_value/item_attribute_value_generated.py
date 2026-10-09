from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ItemAttributeValueGenerated(FrappeChildModel):
    doctype = 'Item Attribute Value'
    attribute_value = models.CharField(max_length=140, blank=True, null=True, default='')
    abbr = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
