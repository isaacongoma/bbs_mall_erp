from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TravelItineraryGenerated(FrappeChildModel):
    doctype = 'Travel Itinerary'
    travel_from = models.CharField(max_length=140, blank=True, null=True, default='')
    travel_to = models.CharField(max_length=140, blank=True, null=True, default='')
    mode_of_travel = models.CharField(max_length=140, blank=True, null=True, default='')
    meal_preference = models.CharField(max_length=140, blank=True, null=True, default='')
    travel_advance_required = models.SmallIntegerField(default=0)
    advance_amount = models.CharField(max_length=140, blank=True, null=True, default='')
    departure_date = FrappeDateTimeField(null=True, blank=True)
    arrival_date = FrappeDateTimeField(null=True, blank=True)
    lodging_required = models.SmallIntegerField(default=0)
    preferred_area_for_lodging = models.CharField(max_length=140, blank=True, null=True, default='')
    check_in_date = models.DateField(null=True, blank=True)
    check_out_date = models.DateField(null=True, blank=True)
    other_details = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
