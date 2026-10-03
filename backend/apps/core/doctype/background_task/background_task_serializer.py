from rest_framework import serializers

from apps.core.doctype.background_task.background_task import BackgroundTask


class BackgroundTaskSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="task_id", read_only=True)

    class Meta:
        model = BackgroundTask
        fields = (
            "name", "task_name", "status", "user", "method", "result", "exception",
            "started_at", "ended_at", "ref_doctype", "ref_docname", "queue", "progress", "creation",
        )
        read_only_fields = fields
