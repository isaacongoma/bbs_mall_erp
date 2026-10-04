from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PaymentTermsTemplateGenerated(FrappeModel):
    doctype = 'Payment Terms Template'
    template_name = models.CharField(max_length=140, blank=True, null=True, default='')
    allocate_payment_based_on_payment_terms = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
