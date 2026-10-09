from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SuccessActionGenerated(FrappeModel):
    doctype = 'Success Action'
    ref_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    first_success_message = models.CharField(max_length=140, blank=True, null=True, default='Congratulations on first creations')
    message = models.CharField(max_length=140, blank=True, null=True, default='Successfully created')
    next_actions = models.CharField(max_length=140, blank=True, null=True, default='')
    action_timeout = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
