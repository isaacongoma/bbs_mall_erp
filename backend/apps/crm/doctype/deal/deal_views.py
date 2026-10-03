from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response

from apps.crm.doctype.deal.deal import CRMDeal, get_deal_contacts
from apps.crm.doctype.deal.deal_serializer import CRMDealListSerializer, CRMDealSerializer


class CRMDealViewSet(viewsets.ModelViewSet):
    queryset = CRMDeal.objects.select_related(
        "status", "organization", "source", "industry", "territory", "deal_owner", "lost_reason", "currency"
    )
    lookup_field = "name"
    filterset_fields = ("status", "source", "territory", "deal_owner", "organization")
    search_fields = ("organization_name", "email", "mobile_no")
    ordering_fields = ("modified", "creation", "probability")

    def get_serializer_class(self):
        if self.action == "list":
            return CRMDealListSerializer
        return CRMDealSerializer

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

    @action(detail=True, methods=["post"], url_path="add-contact")
    def add_contact(self, request, name=None):
        deal = self.get_object()
        contact_id = request.data.get("contact")
        deal.contacts.create(contact_id=contact_id)
        deal.set_primary_contact()
        deal.set_primary_email_mobile_no()
        deal.save()
        return Response(CRMDealSerializer(deal).data)

    @action(detail=True, methods=["post"], url_path="remove-contact")
    def remove_contact(self, request, name=None):
        deal = self.get_object()
        contact_id = request.data.get("contact")
        deal.contacts.filter(contact_id=contact_id).delete()
        deal.set_primary_email_mobile_no()
        deal.save()
        return Response(CRMDealSerializer(deal).data)

    @action(detail=True, methods=["post"], url_path="set-primary-contact")
    def set_primary_contact_action(self, request, name=None):
        deal = self.get_object()
        deal.set_primary_contact(request.data.get("contact"))
        deal.set_primary_email_mobile_no()
        deal.save()
        return Response(CRMDealSerializer(deal).data)

    @action(detail=True, methods=["get"], url_path="contacts")
    def get_contacts(self, request, name=None):
        return Response(get_deal_contacts(name))
