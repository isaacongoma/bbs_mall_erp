from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class FormTourStepGenerated(FrappeChildModel):
    doctype = 'Form Tour Step'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    position = models.CharField(max_length=140, blank=True, null=True, default='Bottom')
    next_step_condition = models.TextField(blank=True, null=True, default='')
    has_next_condition = models.SmallIntegerField(default=0)
    fieldtype = models.CharField(max_length=140, blank=True, null=True, default='0')
    is_table_field = models.SmallIntegerField(default=0)
    child_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    ui_tour = models.SmallIntegerField(default=0)
    element_selector = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_element_selector = models.CharField(max_length=140, blank=True, null=True, default='')
    next_form_tour = models.CharField(max_length=140, blank=True, null=True, default='')
    hide_buttons = models.SmallIntegerField(default=0)
    next_on_click = models.SmallIntegerField(default=0)
    popover_element = models.SmallIntegerField(default=0)
    offset_x = models.IntegerField(null=True, blank=True)
    offset_y = models.IntegerField(null=True, blank=True)
    modal_trigger = models.SmallIntegerField(default=0)
    ondemand_description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
