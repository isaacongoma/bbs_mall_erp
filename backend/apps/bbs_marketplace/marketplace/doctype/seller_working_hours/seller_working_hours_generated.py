from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SellerWorkingHoursGenerated(FrappeChildModel):
    doctype = 'Seller Working Hours'
    day = models.CharField(max_length=140, blank=True, null=True, default='')
    is_closed = models.SmallIntegerField(default=0)
    opens_at = FrappeTimeField(null=True, blank=True)
    closes_at = FrappeTimeField(null=True, blank=True)

    class Meta:
        abstract = True
