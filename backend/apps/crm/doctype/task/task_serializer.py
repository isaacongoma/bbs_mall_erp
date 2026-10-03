from rest_framework import serializers

from apps.crm.doctype.task.task import CRMTask


class CRMTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMTask
        read_only_fields = ("id", "owner", "creation", "modified")
        fields = (
            "id", "title", "priority", "start_date", "assigned_to", "status", "due_date",
            "description", "reference_doctype", "reference_docname", "owner", "creation", "modified",
        )
