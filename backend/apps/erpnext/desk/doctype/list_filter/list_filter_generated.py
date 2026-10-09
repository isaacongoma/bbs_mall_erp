from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ListFilterGenerated(FrappeModel):
    doctype = 'List Filter'
    filter_name = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    for_user = models.CharField(max_length=140, blank=True, null=True, default='')
    route_signature = models.TextField(blank=True, null=True, default='')
    filters = models.TextField(blank=True, null=True, default='')
    columns = models.TextField(blank=True, null=True, default='')
    sort_field = models.CharField(max_length=140, blank=True, null=True, default='')
    sort_order = models.CharField(max_length=140, blank=True, null=True, default='')
    is_standard = models.SmallIntegerField(default=0)
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    layout_order = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
