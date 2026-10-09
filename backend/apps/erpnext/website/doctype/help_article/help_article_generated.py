from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class HelpArticleGenerated(FrappeModel):
    doctype = 'Help Article'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    category = models.CharField(max_length=140, blank=True, null=True, default='')
    published = models.SmallIntegerField(default=0)
    author = models.CharField(max_length=140, blank=True, null=True, default='user_fullname')
    level = models.CharField(max_length=140, blank=True, null=True, default='')
    content = models.TextField(blank=True, null=True, default='')
    likes = models.IntegerField(null=True, blank=True)
    route = models.CharField(max_length=140, blank=True, null=True, default='')
    helpful = models.IntegerField(null=True, blank=True)
    not_helpful = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
