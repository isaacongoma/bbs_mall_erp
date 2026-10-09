from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OpportunityLostReasonDetailGenerated(FrappeChildModel):
    doctype = 'Opportunity Lost Reason Detail'
    lost_reason = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
