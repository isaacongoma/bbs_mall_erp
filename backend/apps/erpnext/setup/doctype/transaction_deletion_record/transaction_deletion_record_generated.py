from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TransactionDeletionRecordGenerated(FrappeModel):
    doctype = 'Transaction Deletion Record'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    delete_bin_data_status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    delete_leads_and_addresses_status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    reset_company_default_values_status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    clear_notifications_status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    initialize_doctypes_table_status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    delete_transactions_status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    error_log = models.TextField(blank=True, null=True, default='')
    process_in_single_transaction = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
