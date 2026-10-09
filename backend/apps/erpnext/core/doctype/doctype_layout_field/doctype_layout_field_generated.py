from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DoctypeLayoutFieldGenerated(FrappeChildModel):
    doctype = 'DocType Layout Field'
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    hidden = models.SmallIntegerField(default=0)
    reqd = models.SmallIntegerField(default=0)
    read_only = models.SmallIntegerField(default=0)
    default = models.TextField(blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    bold = models.SmallIntegerField(default=0)
    allow_in_quick_entry = models.SmallIntegerField(default=0)
    in_list_view = models.SmallIntegerField(default=0)
    in_standard_filter = models.SmallIntegerField(default=0)
    depends_on = models.TextField(blank=True, null=True, default='')
    mandatory_depends_on = models.TextField(blank=True, null=True, default='')
    read_only_depends_on = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
