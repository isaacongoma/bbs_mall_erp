from rest_framework import serializers
from .models import Mall, Building, Floor, Unit

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'
        read_only_fields = ['id', 'creation', 'modified', 'owner', 'modified_by']


class FloorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Floor
        fields = '__all__'
        read_only_fields = ['id', 'creation', 'modified', 'owner', 'modified_by']


class BuildingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = '__all__'
        read_only_fields = ['id', 'creation', 'modified', 'owner', 'modified_by']


class MallSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mall
        fields = '__all__'
        read_only_fields = ['id', 'creation', 'modified', 'owner', 'modified_by']
