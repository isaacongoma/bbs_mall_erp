from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PrintStyleGenerated(FrappeModel):
    doctype = 'Print Style'
    print_style_name = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    standard = models.SmallIntegerField(default=0)
    css = models.TextField(blank=True, null=True, default='')
    preview = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
