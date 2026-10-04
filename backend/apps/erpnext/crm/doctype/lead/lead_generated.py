from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class LeadGenerated(FrappeModel):
    doctype = 'Lead'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    lead_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company_name = models.CharField(max_length=140, blank=True, null=True, default='')
    email_id = models.CharField(max_length=140, blank=True, null=True, default='')
    lead_owner = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Lead')
    salutation = models.CharField(max_length=140, blank=True, null=True, default='')
    gender = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    image = models.TextField(blank=True, null=True, default='')
    phone = models.CharField(max_length=140, blank=True, null=True, default='')
    mobile_no = models.CharField(max_length=140, blank=True, null=True, default='')
    fax = models.CharField(max_length=140, blank=True, null=True, default='')
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    market_segment = models.CharField(max_length=140, blank=True, null=True, default='')
    industry = models.CharField(max_length=140, blank=True, null=True, default='')
    request_type = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    website = models.CharField(max_length=140, blank=True, null=True, default='')
    territory = models.CharField(max_length=140, blank=True, null=True, default='')
    unsubscribed = models.SmallIntegerField(default=0)
    blog_subscriber = models.SmallIntegerField(default=0)
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    language = models.CharField(max_length=140, blank=True, null=True, default='')
    first_name = models.CharField(max_length=140, blank=True, null=True, default='')
    middle_name = models.CharField(max_length=140, blank=True, null=True, default='')
    last_name = models.CharField(max_length=140, blank=True, null=True, default='')
    no_of_employees = models.CharField(max_length=140, blank=True, null=True, default='')
    whatsapp_no = models.CharField(max_length=140, blank=True, null=True, default='')
    phone_ext = models.CharField(max_length=140, blank=True, null=True, default='')
    qualified_by = models.CharField(max_length=140, blank=True, null=True, default='')
    qualified_on = models.DateField(null=True, blank=True)
    qualification_status = models.CharField(max_length=140, blank=True, null=True, default='')
    job_title = models.CharField(max_length=140, blank=True, null=True, default='')
    annual_revenue = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    disabled = models.SmallIntegerField(default=0)
    city = models.CharField(max_length=140, blank=True, null=True, default='')
    state = models.CharField(max_length=140, blank=True, null=True, default='')
    country = models.CharField(max_length=140, blank=True, null=True, default='')
    utm_content = models.CharField(max_length=140, blank=True, null=True, default='')
    utm_source = models.CharField(max_length=140, blank=True, null=True, default='')
    utm_medium = models.CharField(max_length=140, blank=True, null=True, default='')
    utm_campaign = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
