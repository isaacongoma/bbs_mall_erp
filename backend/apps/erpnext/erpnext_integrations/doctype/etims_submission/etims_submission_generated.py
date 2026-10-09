from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class EtimsSubmissionGenerated(FrappeModel):
    doctype = 'eTIMS Submission'
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    settings = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    attempts = models.IntegerField(null=True, blank=True)
    result_code = models.CharField(max_length=140, blank=True, null=True, default='')
    result_message = models.TextField(blank=True, null=True, default='')
    receipt_number = models.CharField(max_length=140, blank=True, null=True, default='')
    total_receipt_number = models.CharField(max_length=140, blank=True, null=True, default='')
    internal_data = models.TextField(blank=True, null=True, default='')
    receipt_signature = models.TextField(blank=True, null=True, default='')
    scu_id = models.CharField(max_length=140, blank=True, null=True, default='')
    scu_datetime = models.CharField(max_length=140, blank=True, null=True, default='')
    qr_url = models.TextField(blank=True, null=True, default='')
    request_body = models.TextField(blank=True, null=True, default='')
    response_body = models.TextField(blank=True, null=True, default='')
    last_attempt_on = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
