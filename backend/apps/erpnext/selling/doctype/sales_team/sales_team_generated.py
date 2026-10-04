from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SalesTeamGenerated(FrappeChildModel):
    doctype = 'Sales Team'
    sales_person = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_no = models.CharField(max_length=140, blank=True, null=True, default='')
    allocated_percentage = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    allocated_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    commission_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    incentives = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
