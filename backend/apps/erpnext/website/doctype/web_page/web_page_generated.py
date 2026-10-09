from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebPageGenerated(FrappeModel):
    doctype = 'Web Page'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    route = models.CharField(max_length=140, blank=True, null=True, default='')
    slideshow = models.CharField(max_length=140, blank=True, null=True, default='')
    published = models.SmallIntegerField(default=1)
    show_title = models.SmallIntegerField(default=0)
    start_date = FrappeDateTimeField(null=True, blank=True)
    end_date = FrappeDateTimeField(null=True, blank=True)
    content_type = models.CharField(max_length=140, blank=True, null=True, default='Page Builder')
    main_section = models.TextField(blank=True, null=True, default='')
    main_section_md = models.TextField(blank=True, null=True, default='')
    main_section_html = models.TextField(blank=True, null=True, default='')
    javascript = models.TextField(blank=True, null=True, default='')
    insert_style = models.SmallIntegerField(default=0)
    text_align = models.CharField(max_length=140, blank=True, null=True, default='')
    css = models.TextField(blank=True, null=True, default='')
    show_sidebar = models.SmallIntegerField(default=0)
    website_sidebar = models.CharField(max_length=140, blank=True, null=True, default='')
    enable_comments = models.SmallIntegerField(default=0)
    idx = models.IntegerField(null=True, blank=True)
    header = models.TextField(blank=True, null=True, default='')
    breadcrumbs = models.TextField(blank=True, null=True, default='')
    dynamic_template = models.SmallIntegerField(default=0)
    full_width = models.SmallIntegerField(default=1)
    meta_title = models.CharField(max_length=140, blank=True, null=True, default='')
    meta_description = models.TextField(blank=True, null=True, default='')
    meta_image = models.TextField(blank=True, null=True, default='')
    dynamic_route = models.SmallIntegerField(default=0)
    context_script = models.TextField(blank=True, null=True, default='')
    module = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
