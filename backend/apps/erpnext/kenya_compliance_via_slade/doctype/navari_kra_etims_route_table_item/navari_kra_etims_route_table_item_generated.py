from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavariKraEtimsRouteTableItemGenerated(FrappeChildModel):
    doctype = 'Navari KRA eTims Route Table Item'
    url_path_function = models.CharField(max_length=140, blank=True, null=True, default='')
    url_path = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.CharField(max_length=140, blank=True, null=True, default='')
    last_request_date = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
