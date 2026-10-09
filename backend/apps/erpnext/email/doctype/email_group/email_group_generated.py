from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmailGroupGenerated(FrappeModel):
    doctype = 'Email Group'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    total_subscribers = models.IntegerField(null=True, blank=True)
    confirmation_email_template = models.CharField(max_length=140, blank=True, null=True, default='')
    welcome_email_template = models.CharField(max_length=140, blank=True, null=True, default='')
    welcome_url = models.CharField(max_length=140, blank=True, null=True, default='')
    add_query_parameters = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
