from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NetworkPrinterSettingsGenerated(FrappeModel):
    doctype = 'Network Printer Settings'
    server_ip = models.CharField(max_length=140, blank=True, null=True, default='localhost')
    port = models.IntegerField(null=True, blank=True)
    printer_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
