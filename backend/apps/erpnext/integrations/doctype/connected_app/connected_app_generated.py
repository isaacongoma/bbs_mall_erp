from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ConnectedAppGenerated(FrappeModel):
    doctype = 'Connected App'
    provider_name = models.CharField(max_length=140, blank=True, null=True, default='')
    openid_configuration = models.CharField(max_length=140, blank=True, null=True, default='')
    client_id = models.CharField(max_length=140, blank=True, null=True, default='')
    redirect_uri = models.CharField(max_length=140, blank=True, null=True, default='')
    client_secret = models.TextField(blank=True, null=True, default='')
    authorization_uri = models.TextField(blank=True, null=True, default='')
    token_uri = models.CharField(max_length=140, blank=True, null=True, default='')
    revocation_uri = models.CharField(max_length=140, blank=True, null=True, default='')
    userinfo_uri = models.CharField(max_length=140, blank=True, null=True, default='')
    introspection_uri = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
