from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.doctype.contact import contact_api
from apps.core.doctype.contact.contact import Contact
from apps.core.doctype.contact.contact_serializer import ContactSerializer


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.select_related("salutation", "gender", "address").prefetch_related(
        "email_ids", "phone_nos"
    )
    serializer_class = ContactSerializer
    lookup_field = "name"
    filterset_fields = ("status",)
    search_fields = ("first_name", "last_name", "full_name", "email_id", "company_name")
    ordering_fields = ("modified", "creation")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_linked_deals(request):
    return Response(contact_api.get_linked_deals(request.data.get("contact")))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_new(request):
    p = request.data
    return Response(contact_api.create_new(p.get("contact"), p.get("field"), p.get("value")))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_as_primary(request):
    p = request.data
    return Response(contact_api.set_as_primary(p.get("contact"), p.get("field"), p.get("value")))
