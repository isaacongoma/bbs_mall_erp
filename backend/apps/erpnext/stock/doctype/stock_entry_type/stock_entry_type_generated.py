from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class StockEntryTypeGenerated(FrappeModel):
    doctype = 'Stock Entry Type'
    purpose = models.CharField(max_length=140, blank=True, null=True, default='Material Issue')
    add_to_transit = models.SmallIntegerField(default=0)
    batch_split = models.SmallIntegerField(default=0)
    is_standard = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
