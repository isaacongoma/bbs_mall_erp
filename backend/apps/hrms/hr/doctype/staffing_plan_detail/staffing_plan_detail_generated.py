from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class StaffingPlanDetailGenerated(FrappeChildModel):
    doctype = 'Staffing Plan Detail'
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    number_of_positions = models.IntegerField(null=True, blank=True)
    estimated_cost_per_position = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    current_count = models.IntegerField(null=True, blank=True)
    current_openings = models.IntegerField(null=True, blank=True)
    vacancies = models.IntegerField(null=True, blank=True)
    total_estimated_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
