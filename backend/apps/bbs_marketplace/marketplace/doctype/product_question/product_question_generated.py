from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProductQuestionGenerated(FrappeModel):
    doctype = 'Product Question'
    listing = models.CharField(max_length=140, blank=True, null=True, default='')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    question = models.TextField(blank=True, null=True, default='')
    answer = models.TextField(blank=True, null=True, default='')
    answered_by = models.CharField(max_length=140, blank=True, null=True, default='')
    answered_on = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
