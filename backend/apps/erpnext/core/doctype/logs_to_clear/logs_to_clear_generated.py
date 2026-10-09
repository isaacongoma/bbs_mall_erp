from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LogsToClearGenerated(FrappeChildModel):
    doctype = 'Logs To Clear'
    ref_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    days = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
