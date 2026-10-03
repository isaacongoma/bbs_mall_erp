from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    IoTGatewayViewSet, IoTDeviceViewSet, RegisteredVehicleViewSet,
    ParkingSessionViewSet, SecurityEventViewSet, ParkingEventWebhook
)

router = DefaultRouter()
router.register(r'gateways', IoTGatewayViewSet, basename='gateway')
router.register(r'devices', IoTDeviceViewSet, basename='device')
router.register(r'vehicles', RegisteredVehicleViewSet, basename='vehicle')
router.register(r'parking-sessions', ParkingSessionViewSet, basename='parkingsession')
router.register(r'security-events', SecurityEventViewSet, basename='securityevent')

urlpatterns = [
    path('', include(router.urls)),
    path('webhook/parking/', ParkingEventWebhook.as_view(), name='parking_webhook'),
]
