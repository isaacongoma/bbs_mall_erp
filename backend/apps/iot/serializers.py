from rest_framework import serializers
from .models import IoTGateway, IoTDevice, RegisteredVehicle, ParkingSession, SecurityEvent

class IoTGatewaySerializer(serializers.ModelSerializer):
    class Meta:
        model = IoTGateway
        fields = '__all__'
        read_only_fields = ['id', 'creation', 'modified', 'owner', 'modified_by']

class IoTDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = IoTDevice
        fields = '__all__'
        read_only_fields = ['id', 'creation', 'modified', 'owner', 'modified_by']

class RegisteredVehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegisteredVehicle
        fields = '__all__'
        read_only_fields = ['id', 'creation', 'modified', 'owner', 'modified_by']

class ParkingSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingSession
        fields = '__all__'
        read_only_fields = ['id', 'creation', 'modified', 'owner', 'modified_by']

class SecurityEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityEvent
        fields = '__all__'
        read_only_fields = ['id', 'creation', 'modified', 'owner', 'modified_by']
