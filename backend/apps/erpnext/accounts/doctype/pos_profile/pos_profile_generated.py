from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PosProfileGenerated(FrappeModel):
    doctype = 'POS Profile'
    disabled = models.SmallIntegerField(default=0)
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    country = models.CharField(max_length=140, blank=True, null=True, default='')
    company_address = models.CharField(max_length=140, blank=True, null=True, default='')
    letter_head = models.CharField(max_length=140, blank=True, null=True, default='')
    tc_name = models.CharField(max_length=140, blank=True, null=True, default='')
    select_print_heading = models.CharField(max_length=140, blank=True, null=True, default='')
    selling_price_list = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    write_off_account = models.CharField(max_length=140, blank=True, null=True, default='')
    write_off_cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    account_for_change_amount = models.CharField(max_length=140, blank=True, null=True, default='')
    income_account = models.CharField(max_length=140, blank=True, null=True, default='')
    expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    taxes_and_charges = models.CharField(max_length=140, blank=True, null=True, default='')
    apply_discount_on = models.CharField(max_length=140, blank=True, null=True, default='Grand Total')
    tax_category = models.CharField(max_length=140, blank=True, null=True, default='')
    print_format = models.CharField(max_length=140, blank=True, null=True, default='')
    receipt_email_template = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    ignore_pricing_rule = models.SmallIntegerField(default=0)
    update_stock = models.SmallIntegerField(default=1)
    hide_unavailable_items = models.SmallIntegerField(default=0)
    hide_images = models.SmallIntegerField(default=0)
    auto_add_item_to_cart = models.SmallIntegerField(default=0)
    allow_rate_change = models.SmallIntegerField(default=0)
    allow_discount_change = models.SmallIntegerField(default=0)
    validate_stock_on_save = models.SmallIntegerField(default=0)
    write_off_limit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    disable_rounded_total = models.SmallIntegerField(default=0)
    utm_campaign = models.CharField(max_length=140, blank=True, null=True, default='')
    utm_source = models.CharField(max_length=140, blank=True, null=True, default='')
    utm_medium = models.CharField(max_length=140, blank=True, null=True, default='')
    print_receipt_on_order_complete = models.SmallIntegerField(default=0)
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    set_grand_total_to_default_mop = models.SmallIntegerField(default=1)
    action_on_new_invoice = models.CharField(max_length=140, blank=True, null=True, default='Always Ask')
    allow_partial_payment = models.SmallIntegerField(default=0)
    allow_warehouse_change = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
