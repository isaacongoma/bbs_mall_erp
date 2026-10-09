from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DocshareGenerated(FrappeModel):
    doctype = 'DocShare'
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    share_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    share_name = models.CharField(max_length=140, blank=True, null=True, default='')
    read = models.SmallIntegerField(default=0)
    write = models.SmallIntegerField(default=0)
    share = models.SmallIntegerField(default=0)
    everyone = models.SmallIntegerField(default=0)
    notify_by_email = models.SmallIntegerField(default=1)
    submit = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
