from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DefaultvalueGenerated(FrappeChildModel):
    doctype = 'DefaultValue'
    defkey = models.CharField(max_length=140, blank=True, null=True, default='')
    defvalue = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
