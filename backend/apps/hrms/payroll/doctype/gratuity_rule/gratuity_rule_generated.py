from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class GratuityRuleGenerated(FrappeModel):
    doctype = 'Gratuity Rule'
    disable = models.SmallIntegerField(default=0)
    calculate_gratuity_amount_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    work_experience_calculation_function = models.CharField(max_length=140, blank=True, null=True, default='Round off Work Experience')
    total_working_days_per_year = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    minimum_year_for_gratuity = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
