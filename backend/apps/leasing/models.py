from django.db import models
from apps.core.models import BaseDocument
from apps.property.models import Unit
import uuid

class Tenant(BaseDocument):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, help_text="Business or Individual Name")
    tenant_type = models.CharField(max_length=50, choices=[
        ('Company', 'Company'),
        ('Individual', 'Individual')
    ], default='Company')
    registration_number = models.CharField(max_length=100, blank=True, help_text="Company Reg No or ID")
    tax_id = models.CharField(max_length=100, blank=True, help_text="KRA PIN or equivalent")
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=50)
    status = models.CharField(max_length=50, choices=[
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Suspended', 'Suspended')
    ], default='Active')

    class Meta:
        verbose_name = "Tenant"
        db_table = "tabTenant"

    def __str__(self):
        return self.name


class Lease(BaseDocument):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.RESTRICT, related_name="leases")
    unit = models.ForeignKey(Unit, on_delete=models.RESTRICT, related_name="leases")
    
    start_date = models.DateField()
    end_date = models.DateField()
    
    rent_amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Monthly Rent Amount")
    service_charge = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    billing_cycle = models.CharField(max_length=50, choices=[
        ('Monthly', 'Monthly'),
        ('Quarterly', 'Quarterly'),
        ('Annually', 'Annually')
    ], default='Monthly')
    
    status = models.CharField(max_length=50, choices=[
        ('Draft', 'Draft'),
        ('Active', 'Active'),
        ('Expired', 'Expired'),
        ('Terminated', 'Terminated'),
        ('Renewed', 'Renewed')
    ], default='Draft')

    class Meta:
        verbose_name = "Lease"
        db_table = "tabLease"

    def __str__(self):
        return f"Lease: {self.tenant.name} - {self.unit.unit_number}"


class LeaseDocument(BaseDocument):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lease = models.ForeignKey(Lease, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=100, choices=[
        ('Signed Contract', 'Signed Contract'),
        ('ID/Passport', 'ID/Passport'),
        ('Company Registration', 'Company Registration'),
        ('Insurance Policy', 'Insurance Policy'),
        ('Other', 'Other')
    ])
    file_url = models.CharField(max_length=255)
    expiry_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Lease Document"
        db_table = "tabLeaseDocument"

    def __str__(self):
        return f"{self.document_type} for {self.lease}"
