from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavariKraEtimsNoticesGenerated(FrappeModel):
    doctype = 'Navari KRA eTims Notices'
    notice_number = models.IntegerField(null=True, blank=True)
    registration_name = models.CharField(max_length=140, blank=True, null=True, default='')
    details_url = models.CharField(max_length=140, blank=True, null=True, default='')
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    registration_datetime = FrappeDateTimeField(null=True, blank=True)
    contents = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
