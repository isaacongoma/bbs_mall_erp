from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class JobCardScheduledTimeGenerated(FrappeChildModel):
    doctype = 'Job Card Scheduled Time'
    from_time = models.DateTimeField(null=True, blank=True)
    to_time = models.DateTimeField(null=True, blank=True)
    time_in_mins = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
