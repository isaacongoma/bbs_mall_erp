from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class UserGroupGenerated(FrappeModel):
    doctype = 'User Group'

    class Meta:
        abstract = True
