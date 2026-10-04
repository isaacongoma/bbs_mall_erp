from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PartyLinkGenerated(FrappeModel):
    doctype = 'Party Link'
    primary_role = models.CharField(max_length=140, blank=True, null=True, default='')
    secondary_role = models.CharField(max_length=140, blank=True, null=True, default='')
    primary_party = models.CharField(max_length=140, blank=True, null=True, default='')
    secondary_party = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
