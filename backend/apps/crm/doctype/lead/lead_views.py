from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response

from apps.crm.doctype.deal.deal_serializer import CRMDealSerializer
from apps.crm.doctype.lead.lead import CRMLead, convert_to_deal
from apps.crm.doctype.lead.lead_serializer import CRMLeadListSerializer, CRMLeadSerializer


class CRMLeadViewSet(viewsets.ModelViewSet):
    queryset = CRMLead.objects.exclude(converted=True).select_related(
        "status", "source", "industry", "territory", "lead_owner", "lost_reason"
    )
    lookup_field = "name"
    filterset_fields = ("status", "source", "territory", "lead_owner", "converted")
    search_fields = ("lead_name", "email", "organization", "mobile_no")
    ordering_fields = ("modified", "creation", "lead_score")

    def get_serializer_class(self):
        if self.action == "list":
            return CRMLeadListSerializer
        return CRMLeadSerializer

    def perform_create(self, serializer):
        try:
            serializer.save()
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages) from exc

    def perform_update(self, serializer):
        try:
            serializer.save()
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages) from exc

    @action(detail=True, methods=["post"], url_path="convert-to-deal")
    def convert_to_deal_action(self, request, name=None):
        try:
            deal = convert_to_deal(name)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages) from exc
        return Response(CRMDealSerializer(deal).data, status=status.HTTP_200_OK)
