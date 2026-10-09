from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebFormFieldGenerated(FrappeChildModel):
    doctype = 'Web Form Field'
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    fieldtype = models.CharField(max_length=140, blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    allow_read_on_all_link_options = models.SmallIntegerField(default=0)
    reqd = models.SmallIntegerField(default=0)
    depends_on = models.TextField(blank=True, null=True, default='')
    read_only = models.SmallIntegerField(default=0)
    show_in_filter = models.SmallIntegerField(default=0)
    hidden = models.SmallIntegerField(default=0)
    options = models.TextField(blank=True, null=True, default='')
    max_length = models.IntegerField(null=True, blank=True)
    max_value = models.IntegerField(null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    default = models.CharField(max_length=140, blank=True, null=True, default='')
    mandatory_depends_on = models.TextField(blank=True, null=True, default='')
    read_only_depends_on = models.TextField(blank=True, null=True, default='')
    precision = models.CharField(max_length=140, blank=True, null=True, default='')
    placeholder = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
