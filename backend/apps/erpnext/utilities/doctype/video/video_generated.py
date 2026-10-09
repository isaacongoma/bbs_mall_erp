from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class VideoGenerated(FrappeModel):
    doctype = 'Video'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    provider = models.CharField(max_length=140, blank=True, null=True, default='')
    url = models.CharField(max_length=140, blank=True, null=True, default='')
    publish_date = models.DateField(null=True, blank=True)
    duration = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    like_count = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    view_count = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    dislike_count = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    comment_count = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    image = models.TextField(blank=True, null=True, default='')
    youtube_video_id = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
