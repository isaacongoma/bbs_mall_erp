from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PosSearchFieldsGenerated(FrappeChildModel):
    doctype = 'POS Search Fields'
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    field = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
