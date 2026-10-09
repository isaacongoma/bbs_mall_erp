from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityReviewGenerated(FrappeModel):
    doctype = 'Quality Review'
    date = models.DateField(null=True, blank=True)
    procedure = models.CharField(max_length=140, blank=True, null=True, default='')
    additional_information = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')
    goal = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
