from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SocialLinkSettingsGenerated(FrappeChildModel):
    doctype = 'Social Link Settings'
    social_link_type = models.CharField(max_length=140, blank=True, null=True, default='')
    color = models.CharField(max_length=140, blank=True, null=True, default='')
    background_color = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
