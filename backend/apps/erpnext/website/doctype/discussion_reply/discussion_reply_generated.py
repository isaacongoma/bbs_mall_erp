from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DiscussionReplyGenerated(FrappeModel):
    doctype = 'Discussion Reply'
    reply = models.TextField(blank=True, null=True, default='')
    topic = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
