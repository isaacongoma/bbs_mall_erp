from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class FileGenerated(FrappeModel):
    doctype = 'File'
    file_name = models.CharField(max_length=140, blank=True, null=True, default='')
    is_private = models.SmallIntegerField(default=0)
    is_home_folder = models.SmallIntegerField(default=0)
    is_attachments_folder = models.SmallIntegerField(default=0)
    file_size = models.IntegerField(null=True, blank=True)
    file_url = models.TextField(blank=True, null=True, default='')
    thumbnail_url = models.TextField(blank=True, null=True, default='')
    folder = models.CharField(max_length=255, blank=True, null=True, default='')
    is_folder = models.SmallIntegerField(default=0)
    attached_to_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    attached_to_name = models.CharField(max_length=140, blank=True, null=True, default='')
    attached_to_field = models.CharField(max_length=140, blank=True, null=True, default='')
    old_parent = models.CharField(max_length=140, blank=True, null=True, default='')
    content_hash = models.CharField(max_length=140, blank=True, null=True, default='')
    uploaded_to_dropbox = models.SmallIntegerField(default=0)
    uploaded_to_google_drive = models.SmallIntegerField(default=0)
    file_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
