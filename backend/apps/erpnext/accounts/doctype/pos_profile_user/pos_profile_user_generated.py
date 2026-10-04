from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PosProfileUserGenerated(FrappeChildModel):
    doctype = 'POS Profile User'
    default = models.SmallIntegerField(default=0)
    user = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
