from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class RequestForQuotationSupplierGenerated(FrappeChildModel):
    doctype = 'Request for Quotation Supplier'
    send_email = models.SmallIntegerField(default=1)
    email_sent = models.SmallIntegerField(default=0)
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    contact = models.CharField(max_length=140, blank=True, null=True, default='')
    quote_status = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_name = models.CharField(max_length=140, blank=True, null=True, default='')
    email_id = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
