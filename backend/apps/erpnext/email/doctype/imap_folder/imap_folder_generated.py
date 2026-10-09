from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ImapFolderGenerated(FrappeChildModel):
    doctype = 'IMAP Folder'
    folder_name = models.CharField(max_length=140, blank=True, null=True, default='')
    append_to = models.CharField(max_length=140, blank=True, null=True, default='')
    uidvalidity = models.CharField(max_length=140, blank=True, null=True, default='')
    uidnext = models.CharField(max_length=140, blank=True, null=True, default='')
    sync_from_uid = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
