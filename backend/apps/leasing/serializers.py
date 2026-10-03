from rest_framework import serializers
from .models import Tenant, Lease, LeaseDocument

class LeaseDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaseDocument
        fields = '__all__'
        read_only_fields = ['id', 'creation', 'modified', 'owner', 'modified_by']

class LeaseSerializer(serializers.ModelSerializer):
    documents = LeaseDocumentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Lease
        fields = '__all__'
        read_only_fields = ['id', 'creation', 'modified', 'owner', 'modified_by']

class TenantSerializer(serializers.ModelSerializer):
    leases = LeaseSerializer(many=True, read_only=True)
    
    class Meta:
        model = Tenant
        fields = '__all__'
        read_only_fields = ['id', 'creation', 'modified', 'owner', 'modified_by']
