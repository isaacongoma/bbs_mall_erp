from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class UserEmailGenerated(FrappeChildModel):
    doctype = 'User Email'
    email_account = models.CharField(max_length=140, blank=True, null=True, default='')
    email_id = models.CharField(max_length=140, blank=True, null=True, default='')
    awaiting_password = models.SmallIntegerField(default=0)
    enable_outgoing = models.SmallIntegerField(default=0)
    used_oauth = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
