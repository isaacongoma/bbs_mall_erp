from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BackgroundTaskGenerated(FrappeModel):
    doctype = 'Background Task'
    task_id = models.CharField(max_length=140, blank=True, null=True, default='')
    job_id = models.CharField(max_length=140, blank=True, null=True, default='')
    task_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    method = models.CharField(max_length=140, blank=True, null=True, default='')
    arguments = models.TextField(blank=True, null=True, default='')
    on_success_callback = models.CharField(max_length=140, blank=True, null=True, default='')
    on_failure_callback = models.CharField(max_length=140, blank=True, null=True, default='')
    result = models.TextField(blank=True, null=True, default='')
    exception = models.TextField(blank=True, null=True, default='')
    started_at = FrappeDateTimeField(null=True, blank=True)
    ended_at = FrappeDateTimeField(null=True, blank=True)
    ref_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    ref_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    queue = models.CharField(max_length=140, blank=True, null=True, default='')
    progress = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stage = models.CharField(max_length=140, blank=True, null=True, default='')
    allow_user_cancellation = models.SmallIntegerField(default=1)
    allow_user_retry = models.SmallIntegerField(default=1)
    show_progress_bar = models.SmallIntegerField(default=1)
    is_mapreduce = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
