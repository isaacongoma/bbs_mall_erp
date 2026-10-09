from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebsiteRouteRedirectGenerated(FrappeChildModel):
    doctype = 'Website Route Redirect'
    source = models.TextField(blank=True, null=True, default='')
    target = models.TextField(blank=True, null=True, default='')
    redirect_http_status = models.CharField(max_length=140, blank=True, null=True, default='301')
    forward_query_parameters = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
