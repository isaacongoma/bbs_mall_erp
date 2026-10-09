from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityInspectionReadingGenerated(FrappeChildModel):
    doctype = 'Quality Inspection Reading'
    specification = models.CharField(max_length=140, blank=True, null=True, default='')
    value = models.CharField(max_length=140, blank=True, null=True, default='')
    reading_1 = models.CharField(max_length=140, blank=True, null=True, default='')
    reading_2 = models.CharField(max_length=140, blank=True, null=True, default='')
    reading_3 = models.CharField(max_length=140, blank=True, null=True, default='')
    reading_4 = models.CharField(max_length=140, blank=True, null=True, default='')
    reading_5 = models.CharField(max_length=140, blank=True, null=True, default='')
    reading_6 = models.CharField(max_length=140, blank=True, null=True, default='')
    reading_7 = models.CharField(max_length=140, blank=True, null=True, default='')
    reading_8 = models.CharField(max_length=140, blank=True, null=True, default='')
    reading_9 = models.CharField(max_length=140, blank=True, null=True, default='')
    reading_10 = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Accepted')
    acceptance_formula = models.TextField(blank=True, null=True, default='')
    formula_based_criteria = models.SmallIntegerField(default=0)
    min_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    max_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reading_value = models.CharField(max_length=140, blank=True, null=True, default='')
    manual_inspection = models.SmallIntegerField(default=0)
    numeric = models.SmallIntegerField(default=1)
    parameter_group = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
