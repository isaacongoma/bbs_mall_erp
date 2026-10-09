from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class UserTypeGenerated(FrappeModel):
    doctype = 'User Type'
    is_standard = models.SmallIntegerField(default=0)
    role = models.CharField(max_length=140, blank=True, null=True, default='')
    apply_user_permission_on = models.CharField(max_length=140, blank=True, null=True, default='')
    user_id_field = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
