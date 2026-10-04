from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class MaintenanceTeamMemberGenerated(FrappeChildModel):
    doctype = 'Maintenance Team Member'
    team_member = models.CharField(max_length=140, blank=True, null=True, default='')
    full_name = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_role = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
