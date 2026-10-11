from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CategoryAttributeGenerated(FrappeChildModel):
    doctype = 'Category Attribute'
    attribute = models.CharField(max_length=140, blank=True, null=True, default='')
    use_for_variants = models.SmallIntegerField(default=0)
    filterable = models.SmallIntegerField(default=1)
    required = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
