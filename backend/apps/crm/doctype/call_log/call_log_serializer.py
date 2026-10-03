from rest_framework import serializers

from apps.crm.doctype.call_log.call_log import CRMCallLog


class CRMCallLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMCallLog
        read_only_fields = ("id", "telephony_medium", "creation", "modified")
        fields = (
            "id", "telephony_medium", "from_number", "to_number", "status", "type", "duration",
            "medium", "start_time", "end_time", "recording_url", "note", "receiver", "caller",
            "reference_doctype", "reference_docname", "creation", "modified",
        )
