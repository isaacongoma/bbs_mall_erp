from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ConsoleLogGenerated(FrappeModel):
    doctype = 'Console Log'
    script = models.TextField(blank=True, null=True, default='')
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    committed = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
