from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PromotionalSchemeGenerated(FrappeModel):
    doctype = 'Promotional Scheme'
    apply_on = models.CharField(max_length=140, blank=True, null=True, default='Item Code')
    disable = models.SmallIntegerField(default=0)
    mixed_conditions = models.SmallIntegerField(default=0)
    is_cumulative = models.SmallIntegerField(default=0)
    apply_rule_on_other = models.CharField(max_length=140, blank=True, null=True, default='')
    other_item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    other_item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    other_brand = models.CharField(max_length=140, blank=True, null=True, default='')
    selling = models.SmallIntegerField(default=0)
    buying = models.SmallIntegerField(default=0)
    applicable_for = models.CharField(max_length=140, blank=True, null=True, default='')
    valid_from = models.DateField(null=True, blank=True)
    valid_upto = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
