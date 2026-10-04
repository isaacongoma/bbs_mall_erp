from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AddressTemplateGenerated(FrappeModel):
    doctype = 'Address Template'
    country = models.CharField(max_length=140, blank=True, null=True, default='')
    is_default = models.SmallIntegerField(default=0)
    template = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
