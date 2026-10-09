from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PersonalDataDownloadRequestGenerated(FrappeModel):
    doctype = 'Personal Data Download Request'
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    user_name = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
