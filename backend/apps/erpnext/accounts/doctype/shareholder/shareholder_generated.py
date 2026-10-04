from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ShareholderGenerated(FrappeModel):
    doctype = 'Shareholder'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    folio_no = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    is_company = models.SmallIntegerField(default=0)
    contact_list = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
