from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class UserInvitationGenerated(FrappeModel):
    doctype = 'User Invitation'
    email = models.CharField(max_length=140, blank=True, null=True, default='')
    invited_by = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    email_sent_at = FrappeDateTimeField(null=True, blank=True)
    accepted_at = FrappeDateTimeField(null=True, blank=True)
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    app_name = models.CharField(max_length=140, blank=True, null=True, default='')
    redirect_to_path = models.CharField(max_length=140, blank=True, null=True, default='')
    key = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
