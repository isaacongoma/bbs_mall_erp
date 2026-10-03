from django.db import models
from apps.core.models import BaseDocument
from apps.leasing.models import Tenant
from apps.property.models import Building
import uuid

class IoTGateway(BaseDocument):
    """Central controllers/NVRs that manage edge devices (e.g., SKIDATA Server, Hikvision NVR, LenelS2)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    mac_address = models.CharField(max_length=50, blank=True)
    vendor = models.CharField(max_length=100, choices=[
        ('SKIDATA', 'SKIDATA'),
        ('Hikvision', 'Hikvision'),
        ('Dahua', 'Dahua'),
        ('Axis', 'Axis'),
        ('Custom', 'Custom')
    ])
    status = models.CharField(max_length=50, choices=[('Online', 'Online'), ('Offline', 'Offline'), ('Maintenance', 'Maintenance')], default='Online')

    class Meta:
        verbose_name = "IoT Gateway"
        db_table = "tabIoTGateway"

    def __str__(self):
        return f"{self.vendor} - {self.name}"


class IoTDevice(BaseDocument):
    """Physical edge nodes: ANPR Cameras, Boom Barriers, Footfall Counters"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gateway = models.ForeignKey(IoTGateway, on_delete=models.CASCADE, related_name="devices")
    building = models.ForeignKey(Building, on_delete=models.RESTRICT, null=True, blank=True)
    name = models.CharField(max_length=255)
    device_type = models.CharField(max_length=100, choices=[
        ('ANPR Camera', 'ANPR Camera'),
        ('Boom Barrier', 'Boom Barrier'),
        ('CCTV Camera', 'CCTV Camera'),
        ('Access Reader', 'Access Reader'),
        ('Footfall Sensor', 'Footfall Sensor'),
        ('Environment Sensor', 'Environment Sensor')
    ])
    location_description = models.CharField(max_length=255, help_text="e.g. Basement 1 Entry Gate A")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "IoT Device"
        db_table = "tabIoTDevice"

    def __str__(self):
        return self.name


class RegisteredVehicle(BaseDocument):
    """Whitelisted/Blacklisted vehicles for ANPR logic"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    license_plate = models.CharField(max_length=20, unique=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.SET_NULL, null=True, blank=True, related_name="vehicles")
    owner_name = models.CharField(max_length=255, blank=True)
    owner_phone = models.CharField(max_length=50, blank=True)
    category = models.CharField(max_length=50, choices=[
        ('Tenant', 'Tenant'),
        ('VIP', 'VIP'),
        ('Staff', 'Staff'),
        ('Contractor', 'Contractor'),
        ('Blacklisted', 'Blacklisted')
    ], default='Tenant')

    class Meta:
        verbose_name = "Registered Vehicle"
        db_table = "tabRegisteredVehicle"

    def __str__(self):
        return self.license_plate


class ParkingSession(BaseDocument):
    """Tracks a vehicle's lifecycle in the mall. Created via SKIDATA/ANPR webhook on entry, updated on exit."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    license_plate = models.CharField(max_length=20, db_index=True)
    vehicle = models.ForeignKey(RegisteredVehicle, on_delete=models.SET_NULL, null=True, blank=True, help_text="Auto-linked if plate is registered")
    
    entry_device = models.ForeignKey(IoTDevice, on_delete=models.RESTRICT, related_name="entries")
    exit_device = models.ForeignKey(IoTDevice, on_delete=models.RESTRICT, related_name="exits", null=True, blank=True)
    
    entry_time = models.DateTimeField()
    exit_time = models.DateTimeField(null=True, blank=True)
    
    duration_minutes = models.IntegerField(default=0)
    calculated_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Financial Integration
    
    status = models.CharField(max_length=50, choices=[
        ('Active', 'Active (In Mall)'),
        ('Paid', 'Paid (Waiting to Exit)'),
        ('Completed', 'Completed (Exited)'),
        ('Violation', 'Violation (Overstay/Blacklisted)')
    ], default='Active')

    class Meta:
        verbose_name = "Parking Session"
        db_table = "tabParkingSession"


class SecurityEvent(BaseDocument):
    """AI/CCTV events like Crowd Detection, Intrusion, Fire, Blacklist Plate match"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(IoTDevice, on_delete=models.RESTRICT, related_name="events")
    event_type = models.CharField(max_length=100, choices=[
        ('Blacklisted Vehicle', 'Blacklisted Vehicle'),
        ('Perimeter Intrusion', 'Perimeter Intrusion'),
        ('Crowd Gathering', 'Crowd Gathering'),
        ('Fire/Smoke Detected', 'Fire/Smoke Detected'),
        ('Hardware Tamper', 'Hardware Tamper')
    ])
    severity = models.CharField(max_length=50, choices=[
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical')
    ], default='Low')
    event_time = models.DateTimeField()
    snapshot_url = models.CharField(max_length=255, blank=True, help_text="URL to NVR snapshot of the event")
    is_acknowledged = models.BooleanField(default=False)
    raw_payload = models.JSONField(null=True, blank=True)

    class Meta:
        verbose_name = "Security Event"
        db_table = "tabSecurityEvent"
