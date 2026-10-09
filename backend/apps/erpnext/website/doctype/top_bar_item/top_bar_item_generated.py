from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TopBarItemGenerated(FrappeChildModel):
    doctype = 'Top Bar Item'
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_label = models.CharField(max_length=140, blank=True, null=True, default='')
    url = models.CharField(max_length=140, blank=True, null=True, default='')
    right = models.SmallIntegerField(default=1)
    open_in_new_tab = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
