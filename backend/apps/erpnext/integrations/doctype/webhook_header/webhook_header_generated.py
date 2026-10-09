from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebhookHeaderGenerated(FrappeChildModel):
    doctype = 'Webhook Header'
    key = models.TextField(blank=True, null=True, default='')
    value = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
