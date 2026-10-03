from django.db import models
from apps.core.models import BaseDocument
import uuid

class Mall(BaseDocument):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    location = models.CharField(max_length=255, blank=True)
    gross_leasable_area = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="In square meters")
    status = models.CharField(max_length=50, choices=[
        ('Operational', 'Operational'),
        ('Under Construction', 'Under Construction'),
        ('Closed', 'Closed')
    ], default='Operational')

    class Meta:
        verbose_name = "Mall"
        db_table = "tabMall"

    def __str__(self):
        return self.name


class Building(BaseDocument):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mall = models.ForeignKey(Mall, on_delete=models.CASCADE, related_name="buildings")
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, help_text="Short code for the building")

    class Meta:
        verbose_name = "Building"
        db_table = "tabBuilding"

    def __str__(self):
        return f"{self.mall.name} - {self.name}"


class Floor(BaseDocument):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name="floors")
    name = models.CharField(max_length=255)
    level = models.IntegerField(help_text="Floor level number, e.g. 0 for Ground, 1 for First Floor, -1 for Basement")
    floor_plan_image = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Floor"
        db_table = "tabFloor"
        unique_together = ('building', 'level')

    def __str__(self):
        return f"{self.building.name} - {self.name}"


class Unit(BaseDocument):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name="units")
    unit_number = models.CharField(max_length=100, unique=True)
    unit_type = models.CharField(max_length=50, choices=[
        ('Retail Shop', 'Retail Shop'),
        ('Food Court', 'Food Court'),
        ('Kiosk', 'Kiosk'),
        ('Anchor Tenant', 'Anchor Tenant'),
        ('Office', 'Office'),
        ('Storage', 'Storage')
    ])
    area = models.DecimalField(max_digits=10, decimal_places=2, help_text="Area in square meters")
    base_rent = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Standard monthly base rent")
    status = models.CharField(max_length=50, choices=[
        ('Vacant', 'Vacant'),
        ('Occupied', 'Occupied'),
        ('Under Maintenance', 'Under Maintenance'),
        ('Reserved', 'Reserved')
    ], default='Vacant')
    
    # Geo-coordinates for indoor wayfinding
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    class Meta:
        verbose_name = "Unit"
        db_table = "tabUnit"

    def __str__(self):
        return self.unit_number
