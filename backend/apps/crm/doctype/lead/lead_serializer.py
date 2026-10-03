from rest_framework import serializers

from apps.crm.doctype.lead.lead import CRMLead


class CRMLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMLead
        read_only_fields = (
            "name", "owner", "creation", "modified", "modified_by",
            "total", "net_total", "converted",
            "sla", "sla_creation", "sla_status", "response_by",
            "first_response_time", "first_responded_on",
            "last_response_time", "last_responded_on",
        )
        fields = (
            "name", "naming_series",
            "salutation", "first_name", "middle_name", "last_name", "lead_name",
            "gender", "email", "mobile_no", "phone", "job_title",
            "status", "organization", "website", "no_of_employees", "annual_revenue",
            "lead_owner", "source", "industry", "territory", "image",
            "converted", "lead_score", "lead_temperature",
            "organization_logo", "company_description", "linkedin", "twitter", "facebook",
            "sla", "sla_creation", "sla_status", "communication_status",
            "response_by", "first_response_time", "first_responded_on",
            "last_response_time", "last_responded_on",
            "total", "net_total",
            "facebook_lead_id", "facebook_form_id",
            "lost_reason", "lost_notes",
            "owner", "creation", "modified", "modified_by",
        )


class CRMLeadListSerializer(serializers.ModelSerializer):
    """Matches default_list_data()'s column set in the original Lead controller."""

    class Meta:
        model = CRMLead
        fields = (
            "name", "lead_name", "organization", "status", "email", "mobile_no",
            "lead_owner", "first_name", "sla_status", "response_by",
            "first_response_time", "first_responded_on", "modified", "image",
        )
