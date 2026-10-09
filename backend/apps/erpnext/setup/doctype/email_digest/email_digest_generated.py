from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmailDigestGenerated(FrappeModel):
    doctype = 'Email Digest'
    enabled = models.SmallIntegerField(default=0)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    frequency = models.CharField(max_length=140, blank=True, null=True, default='')
    next_send = models.CharField(max_length=140, blank=True, null=True, default='')
    income = models.SmallIntegerField(default=0)
    expenses_booked = models.SmallIntegerField(default=0)
    income_year_to_date = models.SmallIntegerField(default=0)
    expense_year_to_date = models.SmallIntegerField(default=0)
    bank_balance = models.SmallIntegerField(default=0)
    credit_balance = models.SmallIntegerField(default=0)
    invoiced_amount = models.SmallIntegerField(default=0)
    payables = models.SmallIntegerField(default=0)
    sales_orders_to_bill = models.SmallIntegerField(default=0)
    purchase_orders_to_bill = models.SmallIntegerField(default=0)
    sales_order = models.SmallIntegerField(default=0)
    purchase_order = models.SmallIntegerField(default=0)
    sales_orders_to_deliver = models.SmallIntegerField(default=0)
    purchase_orders_to_receive = models.SmallIntegerField(default=0)
    sales_invoice = models.SmallIntegerField(default=0)
    purchase_invoice = models.SmallIntegerField(default=0)
    new_quotations = models.SmallIntegerField(default=0)
    pending_quotations = models.SmallIntegerField(default=0)
    issue = models.SmallIntegerField(default=0)
    project = models.SmallIntegerField(default=0)
    purchase_orders_items_overdue = models.SmallIntegerField(default=0)
    calendar_events = models.SmallIntegerField(default=0)
    todo_list = models.SmallIntegerField(default=0)
    notifications = models.SmallIntegerField(default=0)
    add_quote = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
