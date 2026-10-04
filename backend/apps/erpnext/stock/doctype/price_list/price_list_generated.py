from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PriceListGenerated(FrappeModel):
    doctype = 'Price List'
    enabled = models.SmallIntegerField(default=1)
    price_list_name = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    buying = models.SmallIntegerField(default=0)
    selling = models.SmallIntegerField(default=0)
    price_not_uom_dependent = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
