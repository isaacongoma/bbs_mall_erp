from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeReferralGenerated(FrappeModel):
    doctype = 'Employee Referral'
    first_name = models.CharField(max_length=140, blank=True, null=True, default='')
    last_name = models.CharField(max_length=140, blank=True, null=True, default='')
    full_name = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_no = models.CharField(max_length=140, blank=True, null=True, default='')
    current_employer = models.CharField(max_length=140, blank=True, null=True, default='')
    date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    current_job_title = models.CharField(max_length=140, blank=True, null=True, default='')
    resume = models.TextField(blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    work_references = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    for_designation = models.CharField(max_length=140, blank=True, null=True, default='')
    email = models.CharField(max_length=140, blank=True, null=True, default='')
    is_applicable_for_referral_bonus = models.SmallIntegerField(default=1)
    qualification_reason = models.TextField(blank=True, null=True, default='')
    referrer = models.CharField(max_length=140, blank=True, null=True, default='')
    referrer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    resume_link = models.CharField(max_length=140, blank=True, null=True, default='')
    referral_payment_status = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
