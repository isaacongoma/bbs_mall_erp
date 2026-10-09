from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ModuleProfileGenerated(FrappeModel):
    doctype = 'Module Profile'
    module_profile_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
