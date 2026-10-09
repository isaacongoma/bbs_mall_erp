from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavariEtimsRegisteredImportedItemGenerated(FrappeModel):
    doctype = 'Navari eTims Registered Imported Item'
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    product_name = models.CharField(max_length=140, blank=True, null=True, default='')
    product_code = models.CharField(max_length=140, blank=True, null=True, default='')
    origin_nation_code = models.CharField(max_length=140, blank=True, null=True, default='')
    declaration_date = models.DateField(null=True, blank=True)
    item_sequence = models.IntegerField(null=True, blank=True)
    package = models.CharField(max_length=140, blank=True, null=True, default='')
    suppliers_name = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_foreign_currency_amount = models.CharField(max_length=140, blank=True, null=True, default='')
    purchase_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    task_code = models.CharField(max_length=140, blank=True, null=True, default='')
    export_nation_code = models.CharField(max_length=140, blank=True, null=True, default='')
    declaration_number = models.CharField(max_length=140, blank=True, null=True, default='')
    hs_code = models.CharField(max_length=140, blank=True, null=True, default='')
    etims_packaging_unit_code = models.CharField(max_length=140, blank=True, null=True, default='')
    quantity_unit_code = models.CharField(max_length=140, blank=True, null=True, default='')
    agent_name = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_foreign_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_foreign_currency_rate = models.CharField(max_length=140, blank=True, null=True, default='')
    settings = models.CharField(max_length=140, blank=True, null=True, default='')
    slade_id = models.CharField(max_length=140, blank=True, null=True, default='')
    organisation = models.CharField(max_length=140, blank=True, null=True, default='')
    branch = models.CharField(max_length=140, blank=True, null=True, default='')
    imported_item_status = models.CharField(max_length=140, blank=True, null=True, default='')
    imported_item_status_code = models.CharField(max_length=140, blank=True, null=True, default='')
    quantity = models.IntegerField(null=True, blank=True)
    net_weight = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    gross_weight = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_mapped = models.SmallIntegerField(default=0)
    sent_to_etims = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
