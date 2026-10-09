from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityProcedureGenerated(FrappeTreeModel):
    doctype = 'Quality Procedure'
    parent_quality_procedure = models.CharField(max_length=140, blank=True, null=True, default='')
    is_group = models.SmallIntegerField(default=0)
    lft = models.IntegerField(null=True, blank=True)
    rgt = models.IntegerField(null=True, blank=True)
    old_parent = models.CharField(max_length=140, blank=True, null=True, default='')
    quality_procedure_name = models.CharField(max_length=140, blank=True, null=True, default='')
    process_owner = models.CharField(max_length=140, blank=True, null=True, default='')
    process_owner_full_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
