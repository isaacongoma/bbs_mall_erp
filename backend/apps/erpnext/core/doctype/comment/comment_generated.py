from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class CommentGenerated(FrappeModel):
    doctype = 'Comment'
    comment_type = models.CharField(max_length=140, blank=True, null=True, default='Comment')
    comment_email = models.CharField(max_length=140, blank=True, null=True, default='')
    subject = models.TextField(blank=True, null=True, default='')
    comment_by = models.CharField(max_length=140, blank=True, null=True, default='')
    published = models.SmallIntegerField(default=0)
    seen = models.SmallIntegerField(default=0)
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_owner = models.CharField(max_length=140, blank=True, null=True, default='')
    content = models.TextField(blank=True, null=True, default='')
    ip_address = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
