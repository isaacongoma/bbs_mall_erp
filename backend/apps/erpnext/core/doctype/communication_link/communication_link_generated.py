from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CommunicationLinkGenerated(FrappeChildModel):
    doctype = 'Communication Link'
    link_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    link_name = models.CharField(max_length=140, blank=True, null=True, default='')
    link_title = models.CharField(max_length=140, blank=True, null=True, default='')
    communication_date = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
