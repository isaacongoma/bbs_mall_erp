from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OnboardingStepGenerated(FrappeModel):
    doctype = 'Onboarding Step'
    is_complete = models.SmallIntegerField(default=0)
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    action = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_document = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_report = models.CharField(max_length=140, blank=True, null=True, default='')
    video_url = models.CharField(max_length=140, blank=True, null=True, default='')
    report_type = models.CharField(max_length=140, blank=True, null=True, default='')
    is_skipped = models.SmallIntegerField(default=0)
    field = models.CharField(max_length=140, blank=True, null=True, default='')
    value_to_validate = models.CharField(max_length=140, blank=True, null=True, default='')
    report_description = models.CharField(max_length=140, blank=True, null=True, default='')
    report_reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    is_single = models.SmallIntegerField(default=0)
    path = models.CharField(max_length=140, blank=True, null=True, default='')
    callback_title = models.CharField(max_length=140, blank=True, null=True, default='')
    callback_message = models.TextField(blank=True, null=True, default='')
    validate_action = models.SmallIntegerField(default=1)
    show_full_form = models.SmallIntegerField(default=0)
    description = models.TextField(blank=True, null=True, default='')
    intro_video_url = models.CharField(max_length=140, blank=True, null=True, default='')
    action_label = models.CharField(max_length=140, blank=True, null=True, default='')
    show_form_tour = models.SmallIntegerField(default=0)
    form_tour = models.CharField(max_length=140, blank=True, null=True, default='')
    route_options = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
