from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SubscriptionGenerated(FrappeModel):
    doctype = 'Subscription'
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    cancelation_date = models.DateField(null=True, blank=True)
    trial_period_start = models.DateField(null=True, blank=True)
    trial_period_end = models.DateField(null=True, blank=True)
    current_invoice_start = models.DateField(null=True, blank=True)
    current_invoice_end = models.DateField(null=True, blank=True)
    next_billing_period_start = models.DateField(null=True, blank=True)
    next_billing_period_end = models.DateField(null=True, blank=True)
    days_until_due = models.IntegerField(null=True, blank=True)
    cancel_at_period_end = models.SmallIntegerField(default=0)
    apply_additional_discount = models.CharField(max_length=140, blank=True, null=True, default='')
    additional_discount_percentage = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    additional_discount_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_tax_template = models.CharField(max_length=140, blank=True, null=True, default='')
    purchase_tax_template = models.CharField(max_length=140, blank=True, null=True, default='')
    follow_calendar_months = models.SmallIntegerField(default=0)
    generate_new_invoices_past_due_date = models.SmallIntegerField(default=0)
    end_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    submit_invoice = models.SmallIntegerField(default=1)
    generate_invoice_at = models.CharField(max_length=140, blank=True, null=True, default='Postpaid (bill at period end)')
    number_of_days = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
