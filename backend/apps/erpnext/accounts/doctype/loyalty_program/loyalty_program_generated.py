from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class LoyaltyProgramGenerated(FrappeModel):
    doctype = 'Loyalty Program'
    loyalty_program_name = models.CharField(max_length=140, blank=True, null=True, default='')
    loyalty_program_type = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    customer_group = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_territory = models.CharField(max_length=140, blank=True, null=True, default='')
    auto_opt_in = models.SmallIntegerField(default=0)
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    expiry_duration = models.IntegerField(null=True, blank=True)
    expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
