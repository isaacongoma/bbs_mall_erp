from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class WorkflowDocumentStateGenerated(FrappeChildModel):
    doctype = 'Workflow Document State'
    state = models.CharField(max_length=140, blank=True, null=True, default='')
    doc_status = models.CharField(max_length=140, blank=True, null=True, default='0')
    update_field = models.CharField(max_length=140, blank=True, null=True, default='')
    update_value = models.CharField(max_length=140, blank=True, null=True, default='')
    allow_edit = models.CharField(max_length=140, blank=True, null=True, default='')
    message = models.TextField(blank=True, null=True, default='')
    next_action_email_template = models.CharField(max_length=140, blank=True, null=True, default='')
    is_optional_state = models.SmallIntegerField(default=0)
    workflow_builder_id = models.CharField(max_length=140, blank=True, null=True, default='')
    avoid_status_override = models.SmallIntegerField(default=0)
    send_email = models.SmallIntegerField(default=1)
    evaluate_as_expression = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
