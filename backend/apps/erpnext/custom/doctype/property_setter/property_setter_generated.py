from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PropertySetterGenerated(FrappeModel):
    doctype = 'Property Setter'
    doctype_or_field = models.CharField(max_length=140, blank=True, null=True, default='')
    value = models.TextField(blank=True, null=True, default='')
    doc_type = models.CharField(max_length=140, blank=True, null=True, default='')
    field_name = models.CharField(max_length=140, blank=True, null=True, default='')
    property = models.CharField(max_length=140, blank=True, null=True, default='')
    property_type = models.CharField(max_length=140, blank=True, null=True, default='')
    default_value = models.CharField(max_length=140, blank=True, null=True, default='')
    row_name = models.CharField(max_length=140, blank=True, null=True, default='')
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    is_system_generated = models.SmallIntegerField(default=0)
    is_app_disabled = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
