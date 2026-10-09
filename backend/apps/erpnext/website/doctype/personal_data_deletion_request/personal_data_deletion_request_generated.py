from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PersonalDataDeletionRequestGenerated(FrappeModel):
    doctype = 'Personal Data Deletion Request'
    email = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending Verification')
    anonymization_matrix = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
