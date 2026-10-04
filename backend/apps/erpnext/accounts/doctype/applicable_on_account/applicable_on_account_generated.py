from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ApplicableOnAccountGenerated(FrappeChildModel):
    doctype = 'Applicable On Account'
    applicable_on_account = models.CharField(max_length=140, blank=True, null=True, default='')
    is_mandatory = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
