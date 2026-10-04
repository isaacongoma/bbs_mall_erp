from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class CompanyRestrictionGenerated(FrappeChildModel):
    doctype = 'Company Restriction'
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
