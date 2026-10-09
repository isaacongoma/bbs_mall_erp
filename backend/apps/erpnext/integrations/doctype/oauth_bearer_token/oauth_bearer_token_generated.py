from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OauthBearerTokenGenerated(FrappeModel):
    doctype = 'OAuth Bearer Token'
    client = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    scopes = models.TextField(blank=True, null=True, default='')
    access_token = models.CharField(max_length=140, blank=True, null=True, default='')
    refresh_token = models.CharField(max_length=140, blank=True, null=True, default='')
    expiration_time = FrappeDateTimeField(null=True, blank=True)
    expires_in = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
