from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PosOpeningEntryGenerated(FrappeModel):
    doctype = 'POS Opening Entry'
    period_start_date = models.DateTimeField(null=True, blank=True)
    period_end_date = models.DateField(null=True, blank=True)
    posting_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    pos_profile = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    set_posting_date = models.SmallIntegerField(default=0)
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    pos_closing_entry = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
