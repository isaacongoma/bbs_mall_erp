from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CompetitorGenerated(FrappeModel):
    doctype = 'Competitor'
    competitor_name = models.CharField(max_length=140, blank=True, null=True, default='')
    website = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
