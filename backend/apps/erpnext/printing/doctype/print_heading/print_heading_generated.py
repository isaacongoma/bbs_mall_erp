from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PrintHeadingGenerated(FrappeModel):
    doctype = 'Print Heading'
    print_heading = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
