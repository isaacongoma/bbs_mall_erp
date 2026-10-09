from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DiscussionTopicGenerated(FrappeModel):
    doctype = 'Discussion Topic'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_docname = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
