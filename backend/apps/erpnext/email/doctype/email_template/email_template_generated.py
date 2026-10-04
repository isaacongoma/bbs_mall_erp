from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class EmailTemplateGenerated(FrappeModel):
    doctype = 'Email Template'
    subject = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    response = models.TextField(blank=True, null=True, default='')
    use_html = models.SmallIntegerField(default=0)
    response_html = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
