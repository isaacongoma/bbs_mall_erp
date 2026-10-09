from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebhookDataGenerated(FrappeChildModel):
    doctype = 'Webhook Data'
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    key = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
