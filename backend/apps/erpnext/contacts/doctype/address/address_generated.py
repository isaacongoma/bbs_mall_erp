from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AddressGenerated(FrappeModel):
    doctype = 'Address'
    address_title = models.CharField(max_length=140, blank=True, null=True, default='')
    address_type = models.CharField(max_length=140, blank=True, null=True, default='')
    address_line1 = models.CharField(max_length=240, blank=True, null=True, default='')
    address_line2 = models.CharField(max_length=240, blank=True, null=True, default='')
    city = models.CharField(max_length=140, blank=True, null=True, default='')
    county = models.CharField(max_length=140, blank=True, null=True, default='')
    state = models.CharField(max_length=140, blank=True, null=True, default='')
    country = models.CharField(max_length=140, blank=True, null=True, default='')
    pincode = models.CharField(max_length=140, blank=True, null=True, default='')
    email_id = models.CharField(max_length=140, blank=True, null=True, default='')
    phone = models.CharField(max_length=140, blank=True, null=True, default='')
    fax = models.CharField(max_length=140, blank=True, null=True, default='')
    is_primary_address = models.SmallIntegerField(default=0)
    is_shipping_address = models.SmallIntegerField(default=0)
    disabled = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
