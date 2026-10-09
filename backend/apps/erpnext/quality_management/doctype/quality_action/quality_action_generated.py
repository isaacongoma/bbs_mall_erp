from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityActionGenerated(FrappeModel):
    doctype = 'Quality Action'
    goal = models.CharField(max_length=140, blank=True, null=True, default='')
    date = models.DateField(null=True, blank=True)
    procedure = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')
    corrective_preventive = models.CharField(max_length=140, blank=True, null=True, default='Corrective')
    review = models.CharField(max_length=140, blank=True, null=True, default='')
    feedback = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
