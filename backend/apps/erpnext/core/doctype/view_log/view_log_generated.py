from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ViewLogGenerated(FrappeModel):
    doctype = 'View Log'
    viewed_by = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
