from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeFeedbackRatingGenerated(FrappeChildModel):
    doctype = 'Employee Feedback Rating'
    rating = models.CharField(max_length=140, blank=True, null=True, default='')
    criteria = models.CharField(max_length=140, blank=True, null=True, default='')
    per_weightage = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
