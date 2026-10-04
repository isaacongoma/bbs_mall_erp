from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DynamicLinkGenerated(FrappeChildModel):
    doctype = 'Dynamic Link'
    link_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    link_name = models.CharField(max_length=140, blank=True, null=True, default='')
    link_title = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
