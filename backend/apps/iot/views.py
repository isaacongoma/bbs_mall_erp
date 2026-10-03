from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db import transaction
import math

from .models import IoTGateway, IoTDevice, RegisteredVehicle, ParkingSession, SecurityEvent
from .serializers import (
    IoTGatewaySerializer, IoTDeviceSerializer, RegisteredVehicleSerializer,
    ParkingSessionSerializer, SecurityEventSerializer
)

# --- Standard ViewSets ---

class IoTGatewayViewSet(viewsets.ModelViewSet):
    queryset = IoTGateway.objects.all()
    serializer_class = IoTGatewaySerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, modified_by=self.request.user)
    def perform_update(self, serializer):
        serializer.save(modified_by=self.request.user)


class IoTDeviceViewSet(viewsets.ModelViewSet):
    queryset = IoTDevice.objects.all()
    serializer_class = IoTDeviceSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, modified_by=self.request.user)
    def perform_update(self, serializer):
        serializer.save(modified_by=self.request.user)


class RegisteredVehicleViewSet(viewsets.ModelViewSet):
    queryset = RegisteredVehicle.objects.all()
    serializer_class = RegisteredVehicleSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, modified_by=self.request.user)
    def perform_update(self, serializer):
        serializer.save(modified_by=self.request.user)


class ParkingSessionViewSet(viewsets.ModelViewSet):
    queryset = ParkingSession.objects.all()
    serializer_class = ParkingSessionSerializer
    permission_classes = [IsAuthenticated]

class SecurityEventViewSet(viewsets.ModelViewSet):
    queryset = SecurityEvent.objects.all()
    serializer_class = SecurityEventSerializer
    permission_classes = [IsAuthenticated]


# --- Enterprise IoT Webhooks ---

class ParkingEventWebhook(APIView):
    """
    Webhook for SKIDATA / ANPR cameras to push entry/exit events.
    In a true enterprise setup, this would accept API Keys or Mutual TLS, 
    but we use AllowAny for the prototype.
    """
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        payload = request.data
        device_mac = payload.get('device_mac')
        event_type = payload.get('event_type') # 'entry' or 'exit'
        license_plate = payload.get('license_plate', '').replace(" ", "").upper()
        
        device = IoTDevice.objects.filter(gateway__mac_address=device_mac).first() or IoTDevice.objects.first()
        if not device:
            return Response({"error": "Unrecognized device"}, status=status.HTTP_401_UNAUTHORIZED)
            
        vehicle = RegisteredVehicle.objects.filter(license_plate=license_plate).first()

        if event_type == 'entry':
            # Create a new active session
            session = ParkingSession.objects.create(
                license_plate=license_plate,
                vehicle=vehicle,
                entry_device=device,
                entry_time=timezone.now(),
                status='Active'
            )
            
            # VIP/Tenant Blacklist logic
            if vehicle and vehicle.category == 'Blacklisted':
                # Trigger Security Event
                SecurityEvent.objects.create(
                    device=device,
                    event_type='Blacklisted Vehicle',
                    severity='High',
                    event_time=timezone.now(),
                    raw_payload=payload
                )
                return Response({"action": "deny", "reason": "Blacklisted"}, status=status.HTTP_200_OK)

            return Response({"action": "open_barrier", "session_id": session.id})
            
        elif event_type == 'exit':
            # Find the active session for this plate
            session = ParkingSession.objects.filter(license_plate=license_plate, status__in=['Active', 'Paid']).order_by('-entry_time').first()
            if not session:
                return Response({"error": "No active session found"}, status=status.HTTP_404_NOT_FOUND)
                
            session.exit_device = device
            session.exit_time = timezone.now()
            
            # Calculate duration and fee
            delta = session.exit_time - session.entry_time
            minutes = math.ceil(delta.total_seconds() / 60)
            session.duration_minutes = minutes
            
            # Basic Premium Pricing Engine: First 30 mins free, then 100 KES per hour. 
            # Free for VIP/Tenants.
            fee = 0
            if not vehicle or vehicle.category not in ['VIP', 'Tenant']:
                if minutes > 30:
                    hours = math.ceil(minutes / 60)
                    fee = hours * 100
                    
            session.calculated_fee = fee
            
            if fee > 0 and session.status != 'Paid':
                session.status = 'Completed'
                session.save()
                return Response({"action": "request_payment", "amount": fee})

            # If free, paid, or VIP
            session.status = 'Completed'
            session.save()
            return Response({"action": "open_barrier"})
            
        return Response({"error": "Invalid event type"}, status=status.HTTP_400_BAD_REQUEST)
