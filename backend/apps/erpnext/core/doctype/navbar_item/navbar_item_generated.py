from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavbarItemGenerated(FrappeChildModel):
    doctype = 'Navbar Item'
    item_label = models.CharField(max_length=140, blank=True, null=True, default='')
    item_type = models.CharField(max_length=140, blank=True, null=True, default='')
    hidden = models.SmallIntegerField(default=0)
    is_standard = models.SmallIntegerField(default=0)
    route = models.CharField(max_length=140, blank=True, null=True, default='')
    action = models.CharField(max_length=140, blank=True, null=True, default='')
    condition = models.TextField(blank=True, null=True, default='')
    icon = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
