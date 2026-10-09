from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebFormRequestGenerated(FrappeModel):
    doctype = 'Web Form Request'
    web_form = models.CharField(max_length=140, blank=True, null=True, default='')
    key = models.CharField(max_length=140, blank=True, null=True, default='')
    expires_on = FrappeDateTimeField(null=True, blank=True)
    web_form_values = models.TextField(blank=True, null=True, default='')
    doc_values = models.TextField(blank=True, null=True, default='')
    first_used_on = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
