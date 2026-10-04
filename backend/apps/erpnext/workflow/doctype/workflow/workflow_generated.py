from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class WorkflowGenerated(FrappeModel):
    doctype = 'Workflow'
    workflow_name = models.CharField(max_length=140, blank=True, null=True, default='')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    is_active = models.SmallIntegerField(default=0)
    override_status = models.SmallIntegerField(default=0)
    send_email_alert = models.SmallIntegerField(default=0)
    enable_action_confirmation = models.SmallIntegerField(default=0)
    workflow_state_field = models.CharField(max_length=140, blank=True, null=True, default='workflow_state')
    workflow_data = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
