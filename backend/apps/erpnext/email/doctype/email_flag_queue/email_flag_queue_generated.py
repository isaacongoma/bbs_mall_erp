from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmailFlagQueueGenerated(FrappeModel):
    doctype = 'Email Flag Queue'
    is_completed = models.SmallIntegerField(default=0)
    communication = models.CharField(max_length=140, blank=True, null=True, default='')
    action = models.CharField(max_length=140, blank=True, null=True, default='')
    email_account = models.CharField(max_length=140, blank=True, null=True, default='')
    uid = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
