from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmailGroupMemberGenerated(FrappeModel):
    doctype = 'Email Group Member'
    email_group = models.CharField(max_length=140, blank=True, null=True, default='')
    email = models.CharField(max_length=140, blank=True, null=True, default='')
    unsubscribed = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
