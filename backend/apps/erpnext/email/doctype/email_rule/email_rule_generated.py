from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmailRuleGenerated(FrappeModel):
    doctype = 'Email Rule'
    email_id = models.CharField(max_length=140, blank=True, null=True, default='')
    is_spam = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
