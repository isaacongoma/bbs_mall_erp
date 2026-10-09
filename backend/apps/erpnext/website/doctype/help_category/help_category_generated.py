from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class HelpCategoryGenerated(FrappeModel):
    doctype = 'Help Category'
    category_name = models.CharField(max_length=140, blank=True, null=True, default='')
    category_description = models.TextField(blank=True, null=True, default='')
    published = models.SmallIntegerField(default=0)
    help_articles = models.IntegerField(null=True, blank=True)
    route = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
