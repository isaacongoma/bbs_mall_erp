from rest_framework import viewsets

from apps.crm.doctype.organization.organization import CRMOrganization
from apps.crm.doctype.organization.organization_serializer import CRMOrganizationSerializer


class CRMOrganizationViewSet(viewsets.ModelViewSet):
    queryset = CRMOrganization.objects.select_related("industry", "territory", "currency", "address")
    serializer_class = CRMOrganizationSerializer
    lookup_field = "name"
    filterset_fields = ("industry", "territory")
    search_fields = ("organization_name", "website")
    ordering_fields = ("modified", "creation", "annual_revenue")
