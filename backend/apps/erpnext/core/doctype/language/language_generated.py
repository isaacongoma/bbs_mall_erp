from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LanguageGenerated(FrappeModel):
    doctype = 'Language'
    language_code = models.CharField(max_length=140, blank=True, null=True, default='')
    language_name = models.CharField(max_length=140, blank=True, null=True, default='')
    flag = models.CharField(max_length=140, blank=True, null=True, default='')
    based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)
    date_format = models.CharField(max_length=140, blank=True, null=True, default='')
    time_format = models.CharField(max_length=140, blank=True, null=True, default='')
    number_format = models.CharField(max_length=140, blank=True, null=True, default='')
    first_day_of_the_week = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
