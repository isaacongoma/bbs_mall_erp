from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class FinancialReportRowGenerated(FrappeChildModel):
    doctype = 'Financial Report Row'
    reference_code = models.CharField(max_length=140, blank=True, null=True, default='')
    display_name = models.CharField(max_length=140, blank=True, null=True, default='')
    indentation_level = models.IntegerField(null=True, blank=True)
    data_source = models.CharField(max_length=140, blank=True, null=True, default='')
    balance_type = models.CharField(max_length=140, blank=True, null=True, default='')
    bold_text = models.SmallIntegerField(default=0)
    italic_text = models.SmallIntegerField(default=0)
    hidden_calculation = models.SmallIntegerField(default=0)
    hide_when_empty = models.SmallIntegerField(default=0)
    reverse_sign = models.SmallIntegerField(default=0)
    calculation_formula = models.TextField(blank=True, null=True, default='')
    include_in_charts = models.SmallIntegerField(default=0)
    color = models.CharField(max_length=140, blank=True, null=True, default='')
    fieldtype = models.CharField(max_length=140, blank=True, null=True, default='')
    advanced_filtering = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
