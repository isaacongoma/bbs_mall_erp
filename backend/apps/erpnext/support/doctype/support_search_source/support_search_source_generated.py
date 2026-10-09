from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SupportSearchSourceGenerated(FrappeChildModel):
    doctype = 'Support Search Source'
    source_name = models.CharField(max_length=140, blank=True, null=True, default='')
    source_type = models.CharField(max_length=140, blank=True, null=True, default='')
    base_url = models.CharField(max_length=140, blank=True, null=True, default='')
    query_route = models.CharField(max_length=140, blank=True, null=True, default='')
    search_term_param_name = models.CharField(max_length=140, blank=True, null=True, default='')
    response_result_key_path = models.CharField(max_length=140, blank=True, null=True, default='')
    post_route = models.CharField(max_length=140, blank=True, null=True, default='')
    post_route_key_list = models.CharField(max_length=140, blank=True, null=True, default='')
    post_title_key = models.CharField(max_length=140, blank=True, null=True, default='')
    post_description_key = models.CharField(max_length=140, blank=True, null=True, default='')
    source_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    result_title_field = models.CharField(max_length=140, blank=True, null=True, default='')
    result_preview_field = models.CharField(max_length=140, blank=True, null=True, default='')
    result_route_field = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
