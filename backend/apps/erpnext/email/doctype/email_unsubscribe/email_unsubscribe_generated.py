from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class EmailUnsubscribeGenerated(FrappeModel):
    doctype = 'Email Unsubscribe'
    email = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    global_unsubscribe = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
