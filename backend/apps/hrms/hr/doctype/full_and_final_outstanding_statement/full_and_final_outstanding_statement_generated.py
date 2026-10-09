from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class FullAndFinalOutstandingStatementGenerated(FrappeChildModel):
    doctype = 'Full and Final Outstanding Statement'
    status = models.CharField(max_length=140, blank=True, null=True, default='Unsettled')
    remark = models.TextField(blank=True, null=True, default='')
    reference_document = models.CharField(max_length=140, blank=True, null=True, default='')
    component = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reference_document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    paid_via_salary_slip = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
