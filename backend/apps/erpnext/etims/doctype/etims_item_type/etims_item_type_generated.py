from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EtimsItemTypeGenerated(FrappeModel):
    doctype = 'eTims Item Type'
    code = models.CharField(max_length=140, blank=True, null=True, default='')
    sort_order = models.CharField(max_length=140, blank=True, null=True, default='')
    code_name = models.CharField(max_length=140, blank=True, null=True, default='')
    code_description = models.CharField(max_length=140, blank=True, null=True, default='')
    remark = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
