from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class InstalledApplicationGenerated(FrappeChildModel):
    doctype = 'Installed Application'
    git_branch = models.CharField(max_length=140, blank=True, null=True, default='')
    app_name = models.CharField(max_length=140, blank=True, null=True, default='')
    app_version = models.CharField(max_length=140, blank=True, null=True, default='')
    has_setup_wizard = models.SmallIntegerField(default=0)
    is_setup_complete = models.SmallIntegerField(default=0)
    disabled = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
