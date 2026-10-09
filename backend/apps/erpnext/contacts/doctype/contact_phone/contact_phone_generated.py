from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ContactPhoneGenerated(FrappeChildModel):
    doctype = 'Contact Phone'
    phone = models.CharField(max_length=140, blank=True, null=True, default='')
    is_primary_phone = models.SmallIntegerField(default=0)
    is_primary_mobile_no = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
