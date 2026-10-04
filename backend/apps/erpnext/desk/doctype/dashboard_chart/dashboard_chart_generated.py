from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DashboardChartGenerated(FrappeModel):
    doctype = 'Dashboard Chart'
    chart_name = models.CharField(max_length=140, blank=True, null=True, default='')
    chart_type = models.CharField(max_length=140, blank=True, null=True, default='')
    source = models.CharField(max_length=140, blank=True, null=True, default='')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    value_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    timespan = models.CharField(max_length=140, blank=True, null=True, default='')
    time_interval = models.CharField(max_length=140, blank=True, null=True, default='')
    timeseries = models.SmallIntegerField(default=0)
    filters_json = models.TextField(blank=True, null=True, default='')
    type = models.CharField(max_length=140, blank=True, null=True, default='Line')
    color = models.CharField(max_length=140, blank=True, null=True, default='')
    last_synced_on = models.DateTimeField(null=True, blank=True)
    group_by_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    group_by_type = models.CharField(max_length=140, blank=True, null=True, default='Count')
    aggregate_function_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    number_of_groups = models.IntegerField(null=True, blank=True)
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    x_field = models.CharField(max_length=140, blank=True, null=True, default='')
    report_name = models.CharField(max_length=140, blank=True, null=True, default='')
    custom_options = models.TextField(blank=True, null=True, default='')
    is_public = models.SmallIntegerField(default=0)
    heatmap_year = models.CharField(max_length=140, blank=True, null=True, default='')
    is_standard = models.SmallIntegerField(default=0)
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    dynamic_filters_json = models.TextField(blank=True, null=True, default='')
    use_report_chart = models.SmallIntegerField(default=0)
    parent_document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    show_values_over_chart = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
