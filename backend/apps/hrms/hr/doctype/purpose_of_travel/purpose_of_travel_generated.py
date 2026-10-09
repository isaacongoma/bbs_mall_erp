from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PurposeOfTravelGenerated(FrappeModel):
    doctype = 'Purpose of Travel'
    purpose_of_travel = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
