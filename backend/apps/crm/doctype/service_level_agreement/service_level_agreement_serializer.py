from rest_framework import serializers

from apps.crm.doctype.service_day.service_day import CRMServiceDay
from apps.crm.doctype.service_level_agreement.service_level_agreement import CRMServiceLevelAgreement
from apps.crm.doctype.service_level_priority.service_level_priority import CRMServiceLevelPriority


class CRMServiceDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMServiceDay
        fields = ("workday", "start_time", "end_time")


class CRMServiceLevelPrioritySerializer(serializers.ModelSerializer):
    first_response_time = serializers.SerializerMethodField()

    class Meta:
        model = CRMServiceLevelPriority
        fields = ("priority", "first_response_time", "default_priority")

    def get_first_response_time(self, obj):
        return int(obj.first_response_time.total_seconds()) if obj.first_response_time else 0


class CRMServiceLevelAgreementSerializer(serializers.ModelSerializer):
    priorities = CRMServiceLevelPrioritySerializer(many=True, read_only=True)
    working_hours = CRMServiceDaySerializer(many=True, read_only=True)

    class Meta:
        model = CRMServiceLevelAgreement
        fields = (
            "name", "sla_name", "apply_on", "enabled", "default", "start_date", "end_date",
            "condition", "condition_json", "rolling_responses", "holiday_list",
            "priorities", "working_hours",
        )
        read_only_fields = ("name",)
