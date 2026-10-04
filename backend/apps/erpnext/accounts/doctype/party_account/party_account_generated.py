from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PartyAccountGenerated(FrappeChildModel):
    doctype = 'Party Account'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    advance_account = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
