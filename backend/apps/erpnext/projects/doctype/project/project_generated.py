from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ProjectGenerated(FrappeModel):
    doctype = 'Project'
    project_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')
    project_type = models.CharField(max_length=140, blank=True, null=True, default='')
    is_active = models.CharField(max_length=140, blank=True, null=True, default='')
    percent_complete_method = models.CharField(max_length=140, blank=True, null=True, default='Task Completion')
    percent_complete = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    project_template = models.CharField(max_length=140, blank=True, null=True, default='')
    expected_start_date = models.DateField(null=True, blank=True)
    expected_end_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_order = models.CharField(max_length=140, blank=True, null=True, default='')
    copied_from = models.CharField(max_length=140, blank=True, null=True, default='')
    notes = models.TextField(blank=True, null=True, default='')
    actual_start_date = models.DateField(null=True, blank=True)
    actual_time = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    actual_end_date = models.DateField(null=True, blank=True)
    estimated_costing = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_costing_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_purchase_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    total_sales_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_billable_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_billed_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_consumed_material_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    gross_margin = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    per_gross_margin = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    collect_progress = models.SmallIntegerField(default=0)
    holiday_list = models.CharField(max_length=140, blank=True, null=True, default='')
    frequency = models.CharField(max_length=140, blank=True, null=True, default='')
    from_time = models.TimeField(null=True, blank=True)
    to_time = models.TimeField(null=True, blank=True)
    first_email = models.TimeField(null=True, blank=True)
    second_email = models.TimeField(null=True, blank=True)
    daily_time_to_send = models.TimeField(null=True, blank=True)
    day_to_send = models.CharField(max_length=140, blank=True, null=True, default='')
    weekly_time_to_send = models.TimeField(null=True, blank=True)
    message = models.TextField(blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    subject = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
