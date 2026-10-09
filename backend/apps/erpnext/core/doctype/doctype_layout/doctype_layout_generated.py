from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DoctypeLayoutGenerated(FrappeModel):
    doctype = 'DocType Layout'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    is_child_table = models.SmallIntegerField(default=0)
    is_standard = models.SmallIntegerField(default=0)
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    default_print_format = models.CharField(max_length=140, blank=True, null=True, default='')
    default_email_template = models.CharField(max_length=140, blank=True, null=True, default='')
    condition = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
