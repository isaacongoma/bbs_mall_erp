from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ReplyToAddressGenerated(FrappeChildModel):
    doctype = 'Reply To Address'
    _name = models.CharField(max_length=140, blank=True, null=True, default='')
    email = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
