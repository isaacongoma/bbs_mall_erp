from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.crm.doctype.call_log.call_log import CRMCallLog
from apps.crm.doctype.call_log.call_log_api import create_lead_from_call_log, get_call_log
from apps.crm.doctype.call_log.call_log_serializer import CRMCallLogSerializer


class CRMCallLogViewSet(viewsets.ModelViewSet):
    queryset = CRMCallLog.objects.select_related("receiver", "caller", "note")
    serializer_class = CRMCallLogSerializer
    lookup_field = "id"
    filterset_fields = ("status", "type", "telephony_medium", "reference_doctype", "reference_docname")

    @action(detail=True, methods=["get"], url_path="detail")
    def detail_view(self, request, id=None):
        return Response(get_call_log(id))

    @action(detail=True, methods=["post"], url_path="create-lead")
    def create_lead(self, request, id=None):
        lead_name = create_lead_from_call_log(id, request.data.get("lead_details"))
        return Response(lead_name)
