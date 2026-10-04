from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class EventParticipantsGenerated(FrappeChildModel):
    doctype = 'Event Participants'
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    email = models.CharField(max_length=140, blank=True, null=True, default='')
    attending = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
