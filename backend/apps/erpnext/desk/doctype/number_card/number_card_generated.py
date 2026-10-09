from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NumberCardGenerated(FrappeModel):
    doctype = 'Number Card'
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    function = models.CharField(max_length=140, blank=True, null=True, default='')
    aggregate_function_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    filters_json = models.TextField(blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    color = models.CharField(max_length=140, blank=True, null=True, default='')
    is_public = models.SmallIntegerField(default=0)
    show_percentage_stats = models.SmallIntegerField(default=1)
    stats_time_interval = models.CharField(max_length=140, blank=True, null=True, default='Daily')
    is_standard = models.SmallIntegerField(default=0)
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    dynamic_filters_json = models.TextField(blank=True, null=True, default='')
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    report_name = models.CharField(max_length=140, blank=True, null=True, default='')
    report_field = models.CharField(max_length=140, blank=True, null=True, default='')
    method = models.CharField(max_length=140, blank=True, null=True, default='')
    filters_config = models.TextField(blank=True, null=True, default='')
    report_function = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    background_color = models.CharField(max_length=140, blank=True, null=True, default='')
    show_full_number = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
