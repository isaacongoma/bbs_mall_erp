from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TenantNoticeGenerated(FrappeModel):
    doctype = 'Tenant Notice'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='NTC-.YYYY.-.####')
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    priority = models.CharField(max_length=140, blank=True, null=True, default='Info')
    audience = models.CharField(max_length=140, blank=True, null=True, default='All Tenants')
    property = models.CharField(max_length=140, blank=True, null=True, default='')
    publish_on = FrappeDateTimeField(null=True, blank=True)
    expires_on = FrappeDateTimeField(null=True, blank=True)
    message = models.TextField(blank=True, null=True, default='')
    attachment = models.TextField(blank=True, null=True, default='')
    send_sms = models.SmallIntegerField(default=0)
    send_email = models.SmallIntegerField(default=0)
    published_on = FrappeDateTimeField(null=True, blank=True)
    recipient_count = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
