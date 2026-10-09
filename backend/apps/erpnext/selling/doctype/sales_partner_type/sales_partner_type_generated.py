from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalesPartnerTypeGenerated(FrappeModel):
    doctype = 'Sales Partner Type'
    sales_partner_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
