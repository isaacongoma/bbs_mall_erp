from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class JobOfferGenerated(FrappeModel):
    doctype = 'Job Offer'
    job_applicant = models.CharField(max_length=140, blank=True, null=True, default='')
    applicant_name = models.CharField(max_length=140, blank=True, null=True, default='')
    applicant_email = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    offer_date = models.DateField(null=True, blank=True)
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    select_terms = models.CharField(max_length=140, blank=True, null=True, default='')
    terms = models.TextField(blank=True, null=True, default='')
    letter_head = models.CharField(max_length=140, blank=True, null=True, default='')
    select_print_heading = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    job_offer_term_template = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
