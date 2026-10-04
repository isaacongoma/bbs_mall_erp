from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class CommunicationLinkGenerated(FrappeChildModel):
    doctype = 'Communication Link'
    link_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    link_name = models.CharField(max_length=140, blank=True, null=True, default='')
    link_title = models.CharField(max_length=140, blank=True, null=True, default='')
    communication_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
