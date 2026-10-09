from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class KanbanBoardGenerated(FrappeModel):
    doctype = 'Kanban Board'
    kanban_board_name = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    field_name = models.CharField(max_length=140, blank=True, null=True, default='')
    filters = models.TextField(blank=True, null=True, default='')
    is_standard = models.CharField(max_length=140, blank=True, null=True, default='No')
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    private = models.SmallIntegerField(default=0)
    fields = models.TextField(blank=True, null=True, default='')
    show_labels = models.SmallIntegerField(default=0)
    use_kanban_v2 = models.SmallIntegerField(default=0)
    title_field = models.CharField(max_length=140, blank=True, null=True, default='')
    show_assigned_to = models.SmallIntegerField(default=1)
    show_tags_on_card = models.SmallIntegerField(default=0)
    image_field = models.CharField(max_length=140, blank=True, null=True, default='')
    footer_date_field = models.CharField(max_length=140, blank=True, null=True, default='Modified')

    class Meta:
        abstract = True
