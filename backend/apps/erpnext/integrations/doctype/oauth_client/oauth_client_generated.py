from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OauthClientGenerated(FrappeModel):
    doctype = 'OAuth Client'
    client_id = models.CharField(max_length=140, blank=True, null=True, default='')
    app_name = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    client_secret = models.CharField(max_length=140, blank=True, null=True, default='')
    skip_authorization = models.SmallIntegerField(default=0)
    is_dynamic_client = models.SmallIntegerField(default=0)
    scopes = models.TextField(blank=True, null=True, default='all openid')
    redirect_uris = models.TextField(blank=True, null=True, default='')
    default_redirect_uri = models.CharField(max_length=140, blank=True, null=True, default='')
    grant_type = models.CharField(max_length=140, blank=True, null=True, default='')
    response_type = models.CharField(max_length=140, blank=True, null=True, default='Code')
    client_uri = models.CharField(max_length=140, blank=True, null=True, default='')
    logo_uri = models.CharField(max_length=140, blank=True, null=True, default='')
    software_id = models.CharField(max_length=140, blank=True, null=True, default='')
    software_version = models.CharField(max_length=140, blank=True, null=True, default='')
    tos_uri = models.CharField(max_length=140, blank=True, null=True, default='')
    policy_uri = models.CharField(max_length=140, blank=True, null=True, default='')
    contacts = models.TextField(blank=True, null=True, default='')
    token_endpoint_auth_method = models.CharField(max_length=140, blank=True, null=True, default='Client Secret Basic')

    class Meta:
        abstract = True
