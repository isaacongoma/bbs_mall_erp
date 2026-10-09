from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityMeetingAgendaGenerated(FrappeChildModel):
    doctype = 'Quality Meeting Agenda'
    agenda = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
