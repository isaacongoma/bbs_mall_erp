from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CustomHtmlBlockGenerated(FrappeModel):
    doctype = 'Custom HTML Block'
    html = models.TextField(blank=True, null=True, default='')
    script = models.TextField(blank=True, null=True, default='')
    style = models.TextField(blank=True, null=True, default='')
    private = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
