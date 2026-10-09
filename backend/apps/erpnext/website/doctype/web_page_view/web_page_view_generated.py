from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebPageViewGenerated(FrappeModel):
    doctype = 'Web Page View'
    path = models.CharField(max_length=140, blank=True, null=True, default='')
    referrer = models.CharField(max_length=140, blank=True, null=True, default='')
    browser = models.CharField(max_length=140, blank=True, null=True, default='')
    browser_version = models.CharField(max_length=140, blank=True, null=True, default='')
    is_unique = models.CharField(max_length=140, blank=True, null=True, default='')
    time_zone = models.CharField(max_length=140, blank=True, null=True, default='')
    user_agent = models.CharField(max_length=140, blank=True, null=True, default='')
    visitor_id = models.CharField(max_length=140, blank=True, null=True, default='')
    source = models.CharField(max_length=140, blank=True, null=True, default='')
    campaign = models.CharField(max_length=140, blank=True, null=True, default='')
    medium = models.CharField(max_length=140, blank=True, null=True, default='')
    content = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
