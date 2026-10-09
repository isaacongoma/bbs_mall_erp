from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class KenyaSalesReconciliationGenerated(FrappeModel):
    doctype = 'Kenya Sales Reconciliation'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    is_return = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_template = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    results_json = models.TextField(blank=True, null=True, default='')
    last_run = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
