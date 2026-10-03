from rest_framework import viewsets

from apps.core.doctype.background_task.background_task import BackgroundTask
from apps.core.doctype.background_task.background_task_serializer import BackgroundTaskSerializer


class BackgroundTaskViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only -- Background Task rows are only ever written by the automation runner itself
    (apps/core/automation_engine/runner.py), never through the REST API."""

    queryset = BackgroundTask.objects.all()
    serializer_class = BackgroundTaskSerializer
    lookup_field = "task_id"
    filterset_fields = ("task_name", "method", "ref_doctype", "ref_docname", "status")
    ordering_fields = ("creation", "started_at", "ended_at")
