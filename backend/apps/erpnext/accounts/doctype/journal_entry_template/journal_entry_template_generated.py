from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class JournalEntryTemplateGenerated(FrappeModel):
    doctype = 'Journal Entry Template'
    voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    is_opening = models.CharField(max_length=140, blank=True, null=True, default='No')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    template_title = models.CharField(max_length=140, blank=True, null=True, default='')
    multi_currency = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
