from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AutomationFlowGenerated(FrappeModel):
    doctype = 'Automation Flow'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=0)
    disabled_reason = models.TextField(blank=True, null=True, default='')
    trigger_type = models.CharField(max_length=140, blank=True, null=True, default='')
    trigger_field = models.CharField(max_length=140, blank=True, null=True, default='')
    from_value = models.CharField(max_length=140, blank=True, null=True, default='')
    to_value = models.CharField(max_length=140, blank=True, null=True, default='')
    custom_event = models.CharField(max_length=140, blank=True, null=True, default='')
    date_field = models.CharField(max_length=140, blank=True, null=True, default='')
    date_offset = models.IntegerField(null=True, blank=True)
    date_direction = models.CharField(max_length=140, blank=True, null=True, default='')
    cron_expression = models.CharField(max_length=140, blank=True, null=True, default='')
    next_run = FrappeDateTimeField(null=True, blank=True)
    filters = models.TextField(blank=True, null=True, default='')
    condition = models.TextField(blank=True, null=True, default='')
    relationships = models.TextField(blank=True, null=True, default='')
    revalidate_on_run = models.SmallIntegerField(default=0)
    run_as = models.CharField(max_length=140, blank=True, null=True, default='Automation User')
    automation_user = models.CharField(max_length=140, blank=True, null=True, default='Administrator')
    stop_on_error = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
