from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TravelRequestGenerated(FrappeModel):
    doctype = 'Travel Request'
    travel_type = models.CharField(max_length=140, blank=True, null=True, default='')
    travel_funding = models.CharField(max_length=140, blank=True, null=True, default='')
    travel_proof = models.TextField(blank=True, null=True, default='')
    purpose_of_travel = models.CharField(max_length=140, blank=True, null=True, default='')
    details_of_sponsor = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    cell_number = models.CharField(max_length=140, blank=True, null=True, default='')
    prefered_email = models.CharField(max_length=140, blank=True, null=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)
    personal_id_type = models.CharField(max_length=140, blank=True, null=True, default='')
    personal_id_number = models.CharField(max_length=140, blank=True, null=True, default='')
    passport_number = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    name_of_organizer = models.CharField(max_length=140, blank=True, null=True, default='')
    address_of_organizer = models.CharField(max_length=140, blank=True, null=True, default='')
    other_details = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
