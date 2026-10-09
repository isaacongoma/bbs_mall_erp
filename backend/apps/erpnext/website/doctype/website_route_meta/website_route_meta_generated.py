from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebsiteRouteMetaGenerated(FrappeModel):
    doctype = 'Website Route Meta'

    class Meta:
        abstract = True
