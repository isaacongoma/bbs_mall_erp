from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ShareBalanceGenerated(FrappeChildModel):
    doctype = 'Share Balance'
    share_type = models.CharField(max_length=140, blank=True, null=True, default='')
    from_no = models.IntegerField(null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    no_of_shares = models.IntegerField(null=True, blank=True)
    to_no = models.IntegerField(null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_company = models.SmallIntegerField(default=0)
    current_state = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
