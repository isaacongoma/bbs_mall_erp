from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class UserSocialLoginGenerated(FrappeChildModel):
    doctype = 'User Social Login'
    provider = models.CharField(max_length=140, blank=True, null=True, default='')
    username = models.CharField(max_length=140, blank=True, null=True, default='')
    userid = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
