from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class InventoryDimensionGenerated(FrappeModel):
    doctype = 'Inventory Dimension'
    reference_document = models.CharField(max_length=140, blank=True, null=True, default='')
    dimension_name = models.CharField(max_length=140, blank=True, null=True, default='')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    istable = models.SmallIntegerField(default=0)
    condition = models.TextField(blank=True, null=True, default='')
    apply_to_all_doctypes = models.SmallIntegerField(default=1)
    target_fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    source_fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    type_of_transaction = models.CharField(max_length=140, blank=True, null=True, default='')
    fetch_from_parent = models.CharField(max_length=140, blank=True, null=True, default='')
    mandatory_depends_on = models.TextField(blank=True, null=True, default='')
    reqd = models.SmallIntegerField(default=0)
    validate_negative_stock = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
