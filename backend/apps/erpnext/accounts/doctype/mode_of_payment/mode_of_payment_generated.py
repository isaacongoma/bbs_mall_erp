from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ModeOfPaymentGenerated(FrappeModel):
    doctype = 'Mode of Payment'
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
