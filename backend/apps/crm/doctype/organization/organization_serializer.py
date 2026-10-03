from rest_framework import serializers

from apps.crm.doctype.organization.organization import CRMOrganization


class CRMOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMOrganization
        fields = (
            "name", "organization_name", "website", "organization_logo", "no_of_employees", "annual_revenue",
            "industry", "territory", "currency", "exchange_rate", "address", "company_description",
            "linkedin", "twitter", "facebook", "creation", "modified",
        )
        read_only_fields = ("name", "exchange_rate", "creation", "modified")
