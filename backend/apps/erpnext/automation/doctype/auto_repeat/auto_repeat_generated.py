from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AutoRepeatGenerated(FrappeModel):
    doctype = 'Auto Repeat'
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_document = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    disabled = models.SmallIntegerField(default=0)
    frequency = models.CharField(max_length=140, blank=True, null=True, default='')
    repeat_on_day = models.IntegerField(null=True, blank=True)
    next_schedule_date = models.DateField(null=True, blank=True)
    notify_by_email = models.SmallIntegerField(default=0)
    recipients = models.TextField(blank=True, null=True, default='')
    template = models.CharField(max_length=140, blank=True, null=True, default='')
    subject = models.CharField(max_length=140, blank=True, null=True, default='')
    message = models.TextField(blank=True, null=True, default='Please find attached {{ doc.doctype }} #{{ doc.name }}')
    print_format = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    repeat_on_last_day = models.SmallIntegerField(default=0)
    submit_on_creation = models.SmallIntegerField(default=0)
    generate_separate_documents_for_each_assignee = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
