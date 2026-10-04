# Minimal REST endpoints for the small lookup/status doctypes -- these are
# listable/creatable in the original (System Manager/Sales Manager can
# manage them via the desk's generic doctype list), unlike CRM Lead Source /
# CRM Lost Reason which the frontend only reaches through Link search
# (apps/crm/search_api.py). Needed because stores/statuses.js's
# createListResource hits these by plain REST list, not the generic doc
# engine.
from __future__ import annotations

from rest_framework import serializers, viewsets

from apps.core.doctype.gender.gender import Gender
from apps.erpnext.registry import get_model
from apps.core.doctype.salutation.salutation import Salutation
from apps.crm.doctype.communication_status.communication_status import CRMCommunicationStatus
from apps.crm.doctype.deal_status.deal_status import CRMDealStatus
from apps.crm.doctype.form_script.form_script import CRMFormScript
from apps.crm.doctype.lead_status.lead_status import CRMLeadStatus


class CRMLeadStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMLeadStatus
        fields = "__all__"


class CRMLeadStatusViewSet(viewsets.ModelViewSet):
    queryset = CRMLeadStatus.objects.all()
    serializer_class = CRMLeadStatusSerializer
    filterset_fields = ("type",)


class CRMDealStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMDealStatus
        fields = "__all__"


class CRMDealStatusViewSet(viewsets.ModelViewSet):
    queryset = CRMDealStatus.objects.all()
    serializer_class = CRMDealStatusSerializer
    filterset_fields = ("type",)


class CRMCommunicationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMCommunicationStatus
        fields = "__all__"


class CRMCommunicationStatusViewSet(viewsets.ModelViewSet):
    queryset = CRMCommunicationStatus.objects.all()
    serializer_class = CRMCommunicationStatusSerializer


# data/script.js's getScript() lists this by (dt, view, enabled) filters --
# the mechanism behind the Lead/Deal detail page's status dropdown and
# actions menu (setupFormController only initializes document.statuses/
# document.actions once at least one controller class exists for the
# doctype; see crm/migrations/0013_seed_form_scripts.py).
class CRMFormScriptSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMFormScript
        fields = "__all__"


class CRMFormScriptViewSet(viewsets.ModelViewSet):
    queryset = CRMFormScript.objects.all()
    serializer_class = CRMFormScriptSerializer
    filterset_fields = ("dt", "view", "enabled")


# Frappe core lookup doctypes (Salutation/Gender/Address) -- Link fields on
# Contact/CRM Lead/CRM Deal/CRM Organization. Listable/creatable ("+ Create
# New" in the Link dropdown) the same way, via the generic doc engine's
# frappe.client.insert, which needs a real REST endpoint per doctype.
class SalutationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salutation
        fields = "__all__"


class SalutationViewSet(viewsets.ModelViewSet):
    queryset = Salutation.objects.all()
    serializer_class = SalutationSerializer


class GenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gender
        fields = "__all__"


class GenderViewSet(viewsets.ModelViewSet):
    queryset = Gender.objects.all()
    serializer_class = GenderSerializer


class AddressSerializer(serializers.Serializer):
    name = serializers.CharField(read_only=True)
    address_title = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address_line1 = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address_line2 = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    city = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    state = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    country = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    pincode = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return {key: (value if value is not None else "") for key, value in data.items()}

    def create(self, validated_data):
        from django.utils import timezone

        from apps.core.identity import user_email
        from apps.frappe.utils import generate_hash

        now = timezone.now()
        email = user_email(getattr(self.context.get("request"), "user", None)) or ""
        return get_model("Address").objects.create(
            name=generate_hash(length=10), owner=email, modified_by=email, creation=now, modified=now, **validated_data
        )

    def update(self, instance, validated_data):
        from django.utils import timezone

        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.modified = timezone.now()
        instance.save()
        return instance


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer

    def get_queryset(self):
        return get_model("Address").objects.all().order_by("name")
