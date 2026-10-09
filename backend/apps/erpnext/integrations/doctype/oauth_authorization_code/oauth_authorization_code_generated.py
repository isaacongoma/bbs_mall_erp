from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OauthAuthorizationCodeGenerated(FrappeModel):
    doctype = 'OAuth Authorization Code'
    client = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    scopes = models.TextField(blank=True, null=True, default='')
    authorization_code = models.CharField(max_length=140, blank=True, null=True, default='')
    expiration_time = FrappeDateTimeField(null=True, blank=True)
    redirect_uri_bound_to_authorization_code = models.CharField(max_length=140, blank=True, null=True, default='')
    validity = models.CharField(max_length=140, blank=True, null=True, default='')
    nonce = models.CharField(max_length=140, blank=True, null=True, default='')
    code_challenge = models.CharField(max_length=140, blank=True, null=True, default='')
    code_challenge_method = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
