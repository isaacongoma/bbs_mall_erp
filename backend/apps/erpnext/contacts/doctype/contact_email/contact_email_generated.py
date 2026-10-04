from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ContactEmailGenerated(FrappeChildModel):
    doctype = 'Contact Email'
    email_id = models.CharField(max_length=140, blank=True, null=True, default='')
    is_primary = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
