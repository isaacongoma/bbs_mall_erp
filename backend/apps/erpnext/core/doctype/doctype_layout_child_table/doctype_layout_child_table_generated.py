from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DoctypeLayoutChildTableGenerated(FrappeChildModel):
    doctype = 'DocType Layout Child Table'
    table_fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    child_layout = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
