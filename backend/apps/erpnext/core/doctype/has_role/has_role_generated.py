from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class HasRoleGenerated(FrappeChildModel):
    doctype = 'Has Role'
    role = models.CharField(max_length=140, blank=True, default='')

    class Meta:
        abstract = True
