from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SubcontractingOrderGenerated(FrappeModel):
    doctype = 'Subcontracting Order'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    purchase_order = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_name = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_date = models.DateField(null=True, blank=True)
    schedule_date = models.DateField(null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_address = models.CharField(max_length=140, blank=True, null=True, default='')
    address_display = models.TextField(blank=True, null=True, default='')
    contact_person = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_display = models.TextField(blank=True, null=True, default='')
    contact_mobile = models.TextField(blank=True, null=True, default='')
    contact_email = models.TextField(blank=True, null=True, default='')
    shipping_address = models.CharField(max_length=140, blank=True, null=True, default='')
    shipping_address_display = models.TextField(blank=True, null=True, default='')
    billing_address = models.CharField(max_length=140, blank=True, null=True, default='')
    billing_address_display = models.TextField(blank=True, null=True, default='')
    set_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    total_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    set_reserve_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    total_additional_costs = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    per_received = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    select_print_heading = models.CharField(max_length=140, blank=True, null=True, default='')
    letter_head = models.CharField(max_length=140, blank=True, null=True, default='')
    distribute_additional_costs_based_on = models.CharField(max_length=140, blank=True, null=True, default='Qty')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reserve_stock = models.SmallIntegerField(default=0)
    production_plan = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
