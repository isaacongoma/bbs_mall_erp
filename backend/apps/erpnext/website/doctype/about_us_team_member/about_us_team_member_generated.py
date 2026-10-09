from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AboutUsTeamMemberGenerated(FrappeChildModel):
    doctype = 'About Us Team Member'
    full_name = models.CharField(max_length=140, blank=True, null=True, default='')
    image_link = models.TextField(blank=True, null=True, default='')
    bio = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
