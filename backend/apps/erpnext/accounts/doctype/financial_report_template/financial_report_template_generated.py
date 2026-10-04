from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class FinancialReportTemplateGenerated(FrappeModel):
    doctype = 'Financial Report Template'
    template_name = models.CharField(max_length=140, blank=True, null=True, default='')
    report_type = models.CharField(max_length=140, blank=True, null=True, default='')
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
