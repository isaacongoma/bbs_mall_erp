from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TokenCacheGenerated(FrappeModel):
    doctype = 'Token Cache'
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    connected_app = models.CharField(max_length=140, blank=True, null=True, default='')
    access_token = models.TextField(blank=True, null=True, default='')
    refresh_token = models.TextField(blank=True, null=True, default='')
    expires_in = models.IntegerField(null=True, blank=True)
    state = models.CharField(max_length=140, blank=True, null=True, default='')
    success_uri = models.CharField(max_length=140, blank=True, null=True, default='')
    token_type = models.CharField(max_length=140, blank=True, null=True, default='')
    provider_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
