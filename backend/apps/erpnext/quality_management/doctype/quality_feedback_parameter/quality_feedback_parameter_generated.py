from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityFeedbackParameterGenerated(FrappeChildModel):
    doctype = 'Quality Feedback Parameter'
    parameter = models.CharField(max_length=140, blank=True, null=True, default='')
    rating = models.CharField(max_length=140, blank=True, null=True, default='1')
    feedback = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
