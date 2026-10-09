from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SocialLoginKeyGenerated(FrappeModel):
    doctype = 'Social Login Key'
    enable_social_login = models.SmallIntegerField(default=0)
    social_login_provider = models.CharField(max_length=140, blank=True, null=True, default='Custom')
    client_id = models.CharField(max_length=140, blank=True, null=True, default='')
    provider_name = models.CharField(max_length=140, blank=True, null=True, default='')
    client_secret = models.TextField(blank=True, null=True, default='')
    icon = models.CharField(max_length=140, blank=True, null=True, default='')
    base_url = models.CharField(max_length=140, blank=True, null=True, default='')
    authorize_url = models.CharField(max_length=140, blank=True, null=True, default='')
    access_token_url = models.CharField(max_length=140, blank=True, null=True, default='')
    redirect_url = models.CharField(max_length=140, blank=True, null=True, default='')
    api_endpoint = models.CharField(max_length=140, blank=True, null=True, default='')
    custom_base_url = models.SmallIntegerField(default=0)
    api_endpoint_args = models.TextField(blank=True, null=True, default='')
    auth_url_data = models.TextField(blank=True, null=True, default='')
    user_id_property = models.CharField(max_length=140, blank=True, null=True, default='')
    sign_ups = models.CharField(max_length=140, blank=True, null=True, default='')
    show_in_resource_metadata = models.SmallIntegerField(default=1)
    trust_email_without_verified_claim = models.SmallIntegerField(default=0)
    tenant_id = models.CharField(max_length=140, blank=True, null=True, default='')
    trust_any_tenant = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
