from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ProspectLeadGenerated(FrappeChildModel):
    doctype = 'Prospect Lead'
    lead = models.CharField(max_length=140, blank=True, null=True, default='')
    lead_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    email = models.CharField(max_length=140, blank=True, null=True, default='')
    mobile_no = models.CharField(max_length=140, blank=True, null=True, default='')
    lead_owner = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
