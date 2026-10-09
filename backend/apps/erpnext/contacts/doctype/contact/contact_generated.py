from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ContactGenerated(FrappeModel):
    doctype = 'Contact'
    first_name = models.CharField(max_length=140, blank=True, null=True, default='')
    last_name = models.CharField(max_length=140, blank=True, null=True, default='')
    email_id = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Passive')
    salutation = models.CharField(max_length=140, blank=True, null=True, default='')
    gender = models.CharField(max_length=140, blank=True, null=True, default='')
    phone = models.CharField(max_length=140, blank=True, null=True, default='')
    image = models.TextField(blank=True, null=True, default='')
    is_primary_contact = models.SmallIntegerField(default=0)
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    unsubscribed = models.SmallIntegerField(default=0)
    middle_name = models.CharField(max_length=140, blank=True, null=True, default='')
    address = models.CharField(max_length=140, blank=True, null=True, default='')
    mobile_no = models.CharField(max_length=140, blank=True, null=True, default='')
    pulled_from_google_contacts = models.SmallIntegerField(default=0)
    sync_with_google_contacts = models.SmallIntegerField(default=0)
    google_contacts = models.CharField(max_length=140, blank=True, null=True, default='')
    google_contacts_id = models.CharField(max_length=140, blank=True, null=True, default='')
    company_name = models.CharField(max_length=140, blank=True, null=True, default='')
    full_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
