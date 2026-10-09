from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DoctypeLinkGenerated(FrappeChildModel):
    doctype = 'DocType Link'
    link_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    link_fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    group = models.CharField(max_length=140, blank=True, null=True, default='')
    hidden = models.SmallIntegerField(default=0)
    custom = models.SmallIntegerField(default=0)
    parent_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    is_child_table = models.SmallIntegerField(default=0)
    table_fieldname = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
