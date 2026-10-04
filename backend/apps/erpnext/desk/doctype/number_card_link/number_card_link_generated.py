from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class NumberCardLinkGenerated(FrappeChildModel):
    doctype = 'Number Card Link'
    card = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
