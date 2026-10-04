from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class FiscalYearCompanyGenerated(FrappeChildModel):
    doctype = 'Fiscal Year Company'
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
