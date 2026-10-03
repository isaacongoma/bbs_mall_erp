from rest_framework import viewsets

from apps.crm.doctype.task.task import CRMTask
from apps.crm.doctype.task.task_serializer import CRMTaskSerializer


class CRMTaskViewSet(viewsets.ModelViewSet):
    queryset = CRMTask.objects.select_related("assigned_to")
    serializer_class = CRMTaskSerializer
    filterset_fields = ("status", "priority", "assigned_to", "reference_doctype", "reference_docname")
