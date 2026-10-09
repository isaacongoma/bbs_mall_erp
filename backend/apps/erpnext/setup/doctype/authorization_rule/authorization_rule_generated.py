from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AuthorizationRuleGenerated(FrappeModel):
    doctype = 'Authorization Rule'
    transaction = models.CharField(max_length=140, blank=True, null=True, default='')
    based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_or_item = models.CharField(max_length=140, blank=True, null=True, default='')
    master_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    system_role = models.CharField(max_length=140, blank=True, null=True, default='')
    to_emp = models.CharField(max_length=140, blank=True, null=True, default='')
    system_user = models.CharField(max_length=140, blank=True, null=True, default='')
    to_designation = models.CharField(max_length=140, blank=True, null=True, default='')
    approving_role = models.CharField(max_length=140, blank=True, null=True, default='')
    approving_user = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
