from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DrivingLicenseCategoryGenerated(FrappeChildModel):
    doctype = 'Driving License Category'
    class_field = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.CharField(max_length=140, blank=True, null=True, default='')
    issuing_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
