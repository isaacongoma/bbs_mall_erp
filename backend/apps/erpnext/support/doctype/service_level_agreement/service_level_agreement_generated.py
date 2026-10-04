from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ServiceLevelAgreementGenerated(FrappeModel):
    doctype = 'Service Level Agreement'
    service_level = models.CharField(max_length=140, blank=True, null=True, default='')
    holiday_list = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    entity = models.CharField(max_length=140, blank=True, null=True, default='')
    entity_type = models.CharField(max_length=140, blank=True, null=True, default='')
    default_service_level_agreement = models.SmallIntegerField(default=0)
    default_priority = models.CharField(max_length=140, blank=True, null=True, default='')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)
    apply_sla_for_resolution = models.SmallIntegerField(default=1)
    condition = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
