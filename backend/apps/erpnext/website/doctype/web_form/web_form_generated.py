from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebFormGenerated(FrappeModel):
    doctype = 'Web Form'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    route = models.CharField(max_length=140, blank=True, null=True, default='')
    doc_type = models.CharField(max_length=140, blank=True, null=True, default='')
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    is_standard = models.SmallIntegerField(default=0)
    published = models.SmallIntegerField(default=0)
    login_required = models.SmallIntegerField(default=0)
    allow_edit = models.SmallIntegerField(default=0)
    allow_multiple = models.SmallIntegerField(default=0)
    allow_delete = models.SmallIntegerField(default=0)
    allow_print = models.SmallIntegerField(default=0)
    print_format = models.CharField(max_length=140, blank=True, null=True, default='')
    allow_comments = models.SmallIntegerField(default=0)
    show_attachments = models.SmallIntegerField(default=0)
    allow_incomplete = models.SmallIntegerField(default=0)
    introduction_text = models.TextField(blank=True, null=True, default='')
    max_attachment_size = models.IntegerField(null=True, blank=True)
    client_script = models.TextField(blank=True, null=True, default='')
    button_label = models.CharField(max_length=140, blank=True, null=True, default='Save')
    success_message = models.TextField(blank=True, null=True, default='')
    success_url = models.CharField(max_length=140, blank=True, null=True, default='')
    show_sidebar = models.SmallIntegerField(default=0)
    breadcrumbs = models.TextField(blank=True, null=True, default='')
    custom_css = models.TextField(blank=True, null=True, default='')
    apply_document_permissions = models.SmallIntegerField(default=0)
    show_list = models.SmallIntegerField(default=0)
    list_title = models.CharField(max_length=140, blank=True, null=True, default='')
    website_sidebar = models.CharField(max_length=140, blank=True, null=True, default='')
    success_title = models.CharField(max_length=140, blank=True, null=True, default='')
    banner_image = models.TextField(blank=True, null=True, default='')
    meta_title = models.CharField(max_length=140, blank=True, null=True, default='')
    meta_description = models.TextField(blank=True, null=True, default='')
    meta_image = models.TextField(blank=True, null=True, default='')
    anonymous = models.SmallIntegerField(default=0)
    condition_json = models.TextField(blank=True, null=True, default='')
    hide_navbar = models.SmallIntegerField(default=0)
    hide_footer = models.SmallIntegerField(default=0)
    allowed_embedding_domains = models.TextField(blank=True, null=True, default='')
    dynamic_filters_json = models.TextField(blank=True, null=True, default='')
    key_required = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
