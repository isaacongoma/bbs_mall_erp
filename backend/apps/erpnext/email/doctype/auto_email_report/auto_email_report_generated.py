from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AutoEmailReportGenerated(FrappeModel):
    doctype = 'Auto Email Report'
    report = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='User')
    enabled = models.SmallIntegerField(default=1)
    report_type = models.CharField(max_length=140, blank=True, null=True, default='')
    send_if_data = models.SmallIntegerField(default=1)
    data_modified_till = models.IntegerField(null=True, blank=True)
    no_of_rows = models.IntegerField(null=True, blank=True)
    filters = models.TextField(blank=True, null=True, default='')
    filter_meta = models.TextField(blank=True, null=True, default='')
    from_date_field = models.CharField(max_length=140, blank=True, null=True, default='')
    to_date_field = models.CharField(max_length=140, blank=True, null=True, default='')
    dynamic_date_period = models.CharField(max_length=140, blank=True, null=True, default='')
    email_to = models.TextField(blank=True, null=True, default='')
    day_of_week = models.CharField(max_length=140, blank=True, null=True, default='Monday')
    frequency = models.CharField(max_length=140, blank=True, null=True, default='')
    format = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    reference_report = models.CharField(max_length=140, blank=True, null=True, default='')
    sender = models.CharField(max_length=140, blank=True, null=True, default='')
    use_first_day_of_period = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
