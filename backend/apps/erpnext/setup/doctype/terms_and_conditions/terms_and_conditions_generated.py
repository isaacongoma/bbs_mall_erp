from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class TermsAndConditionsGenerated(FrappeModel):
    doctype = 'Terms and Conditions'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    terms = models.TextField(blank=True, null=True, default='')
    selling = models.SmallIntegerField(default=1)
    buying = models.SmallIntegerField(default=1)
    copy_attachments_to_transaction = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
