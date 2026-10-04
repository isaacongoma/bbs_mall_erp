from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class MaterialRequestGenerated(FrappeModel):
    doctype = 'Material Request'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request_type = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    schedule_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    scan_barcode = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    per_ordered = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    per_received = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    letter_head = models.CharField(max_length=140, blank=True, null=True, default='')
    select_print_heading = models.CharField(max_length=140, blank=True, null=True, default='')
    tc_name = models.CharField(max_length=140, blank=True, null=True, default='')
    terms = models.TextField(blank=True, null=True, default='')
    job_card = models.CharField(max_length=140, blank=True, null=True, default='')
    set_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    set_from_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    transfer_status = models.CharField(max_length=140, blank=True, null=True, default='')
    work_order = models.CharField(max_length=140, blank=True, null=True, default='')
    buying_price_list = models.CharField(max_length=140, blank=True, null=True, default='')
    last_scanned_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    auto_created_via_reorder = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
