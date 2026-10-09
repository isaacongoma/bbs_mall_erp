from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NotificationLogGenerated(FrappeModel):
    doctype = 'Notification Log'
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    title = models.TextField(blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    document_name = models.CharField(max_length=140, blank=True, null=True, default='')
    source_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    source_name = models.CharField(max_length=140, blank=True, null=True, default='')
    app = models.CharField(max_length=140, blank=True, null=True, default='')
    link = models.TextField(blank=True, null=True, default='')
    for_user = models.CharField(max_length=140, blank=True, null=True, default='')
    from_user = models.CharField(max_length=140, blank=True, null=True, default='')
    read = models.SmallIntegerField(default=0)
    attached_file = models.TextField(blank=True, null=True, default='')
    subject = models.TextField(blank=True, null=True, default='')
    email_content = models.TextField(blank=True, null=True, default='')
    email_header = models.CharField(max_length=140, blank=True, null=True, default='')
    _seen = models.TextField(null=True, blank=True)

    class Meta:
        abstract = True
