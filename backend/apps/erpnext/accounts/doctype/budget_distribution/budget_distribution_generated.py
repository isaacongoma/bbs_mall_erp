from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class BudgetDistributionGenerated(FrappeChildModel):
    doctype = 'Budget Distribution'
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    percent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
