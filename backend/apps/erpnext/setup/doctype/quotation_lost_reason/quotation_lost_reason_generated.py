from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class QuotationLostReasonGenerated(FrappeModel):
    doctype = 'Quotation Lost Reason'
    order_lost_reason = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
