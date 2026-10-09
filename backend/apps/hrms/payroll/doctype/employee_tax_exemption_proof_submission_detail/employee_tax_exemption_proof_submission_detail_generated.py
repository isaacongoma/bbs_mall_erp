from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeTaxExemptionProofSubmissionDetailGenerated(FrappeChildModel):
    doctype = 'Employee Tax Exemption Proof Submission Detail'
    exemption_sub_category = models.CharField(max_length=140, blank=True, null=True, default='')
    exemption_category = models.CharField(max_length=140, blank=True, null=True, default='')
    max_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    type_of_proof = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    attach_proof = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
