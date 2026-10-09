from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EventGenerated(FrappeModel):
    doctype = 'Event'
    subject = models.TextField(blank=True, null=True, default='')
    event_category = models.CharField(max_length=140, blank=True, null=True, default='')
    event_type = models.CharField(max_length=140, blank=True, null=True, default='')
    send_reminder = models.SmallIntegerField(default=1)
    repeat_this_event = models.SmallIntegerField(default=0)
    starts_on = FrappeDateTimeField(null=True, blank=True)
    ends_on = FrappeDateTimeField(null=True, blank=True)
    all_day = models.SmallIntegerField(default=0)
    repeat_on = models.CharField(max_length=140, blank=True, null=True, default='')
    repeat_till = models.DateField(null=True, blank=True)
    monday = models.SmallIntegerField(default=0)
    tuesday = models.SmallIntegerField(default=0)
    wednesday = models.SmallIntegerField(default=0)
    thursday = models.SmallIntegerField(default=0)
    friday = models.SmallIntegerField(default=0)
    saturday = models.SmallIntegerField(default=0)
    sunday = models.SmallIntegerField(default=0)
    color = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')
    google_calendar_id = models.CharField(max_length=140, blank=True, null=True, default='')
    google_calendar_event_id = models.CharField(max_length=320, blank=True, null=True, default='')
    sync_with_google_calendar = models.SmallIntegerField(default=0)
    google_calendar = models.CharField(max_length=140, blank=True, null=True, default='')
    pulled_from_google_calendar = models.SmallIntegerField(default=0)
    sender = models.CharField(max_length=140, blank=True, null=True, default='')
    add_video_conferencing = models.SmallIntegerField(default=0)
    google_meet_link = models.TextField(blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    location = models.CharField(max_length=140, blank=True, null=True, default='')
    attending = models.CharField(max_length=140, blank=True, null=True, default='')
    _seen = models.TextField(null=True, blank=True)

    class Meta:
        abstract = True
