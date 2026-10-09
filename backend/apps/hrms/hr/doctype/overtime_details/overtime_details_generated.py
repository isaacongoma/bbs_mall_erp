from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OvertimeDetailsGenerated(FrappeChildModel):
    doctype = 'Overtime Details'
    reference_document = models.CharField(max_length=140, blank=True, null=True, default='')
    date = models.DateField(null=True, blank=True)
    overtime_type = models.CharField(max_length=140, blank=True, null=True, default='')
    overtime_duration = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    maximum_overtime_hours_allowed = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    standard_working_hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
