from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ListViewSettingsGenerated(FrappeModel):
    doctype = 'List View Settings'
    disable_count = models.SmallIntegerField(default=0)
    disable_sidebar_stats = models.SmallIntegerField(default=0)
    disable_auto_refresh = models.SmallIntegerField(default=0)
    fields = models.TextField(blank=True, null=True, default='')
    disable_comment_count = models.SmallIntegerField(default=0)
    allow_edit = models.SmallIntegerField(default=0)
    disable_automatic_recency_filters = models.SmallIntegerField(default=0)
    disable_scrolling = models.SmallIntegerField(default=0)
    show_tags = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
