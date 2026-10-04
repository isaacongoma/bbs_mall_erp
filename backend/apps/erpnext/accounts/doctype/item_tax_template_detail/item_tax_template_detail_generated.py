from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ItemTaxTemplateDetailGenerated(FrappeChildModel):
    doctype = 'Item Tax Template Detail'
    tax_type = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    not_applicable = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
