from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ModuleDefGenerated(FrappeModel):
    doctype = 'Module Def'
    module_name = models.CharField(max_length=140, blank=True, null=True, default='')
    app_name = models.CharField(max_length=140, blank=True, null=True, default='')
    restrict_to_domain = models.CharField(max_length=140, blank=True, null=True, default='')
    custom = models.SmallIntegerField(default=0)
    package = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
