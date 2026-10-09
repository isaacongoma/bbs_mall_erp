from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class UserGroupMemberGenerated(FrappeChildModel):
    doctype = 'User Group Member'
    user = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
