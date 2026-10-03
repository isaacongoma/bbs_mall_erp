from rest_framework import serializers

from apps.crm.doctype.deal.deal import CRMDeal


class CRMDealSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMDeal
        read_only_fields = (
            "name", "owner", "creation", "modified", "modified_by",
            "total", "net_total", "email", "mobile_no", "phone",
            "sla", "sla_creation", "sla_status", "response_by",
            "first_response_time", "first_responded_on",
            "last_response_time", "last_responded_on", "exchange_rate",
        )
        fields = (
            "name", "naming_series", "organization", "organization_name", "next_step", "status",
            "deal_owner", "probability", "expected_deal_value", "deal_value",
            "expected_closure_date", "closed_date", "contact", "lead", "source", "lead_name",
            "website", "organization_logo", "company_description", "linkedin", "twitter", "facebook",
            "no_of_employees", "job_title", "territory", "currency", "exchange_rate", "annual_revenue",
            "industry", "salutation", "first_name", "last_name", "gender", "email", "mobile_no", "phone",
            "total", "net_total", "sla", "sla_creation", "sla_status", "communication_status",
            "response_by", "first_response_time", "first_responded_on",
            "last_response_time", "last_responded_on", "lost_reason", "lost_notes",
            "owner", "creation", "modified", "modified_by",
        )


class CRMDealListSerializer(serializers.ModelSerializer):
    """Matches default_list_data()'s column set in the original Deal controller."""

    class Meta:
        model = CRMDeal
        fields = (
            "name", "organization", "annual_revenue", "status", "email", "currency",
            "mobile_no", "deal_owner", "sla_status", "response_by",
            "first_response_time", "first_responded_on", "modified",
        )
