from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class FormTourGenerated(FrappeModel):
    doctype = 'Form Tour'
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    save_on_complete = models.SmallIntegerField(default=0)
    is_standard = models.SmallIntegerField(default=0)
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    first_document = models.SmallIntegerField(default=0)
    include_name_field = models.SmallIntegerField(default=0)
    ui_tour = models.SmallIntegerField(default=0)
    page_route = models.TextField(blank=True, null=True, default='')
    dashboard_name = models.CharField(max_length=140, blank=True, null=True, default='')
    view_name = models.CharField(max_length=140, blank=True, null=True, default='')
    workspace_name = models.CharField(max_length=140, blank=True, null=True, default='')
    page_name = models.CharField(max_length=140, blank=True, null=True, default='')
    list_name = models.CharField(max_length=140, blank=True, null=True, default='List')
    report_name = models.CharField(max_length=140, blank=True, null=True, default='')
    track_steps = models.SmallIntegerField(default=0)
    new_document_form = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
