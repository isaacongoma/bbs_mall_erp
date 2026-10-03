from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.crm.doctype.lead_sync_source import facebook
from apps.crm.doctype.lead_sync_source.lead_sync_source import (
    FacebookLeadForm,
    FacebookLeadFormQuestion,
    FacebookPage,
    FailedLeadSyncLog,
    LeadSyncSource,
)

MASK = "*****"


def _require_manager(request):
    if not (request.user.is_superuser or request.user.is_staff):
        raise PermissionDenied("Only managers can manage lead sync sources")


class ManagerOnly:
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        _require_manager(request)


class LeadSyncSourceSerializer(serializers.ModelSerializer):
    facebook_page = serializers.PrimaryKeyRelatedField(queryset=FacebookPage.objects.all(), allow_null=True, required=False)
    facebook_lead_form = serializers.PrimaryKeyRelatedField(
        queryset=FacebookLeadForm.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = LeadSyncSource
        fields = (
            "name", "type", "access_token", "enabled", "last_synced_at", "background_sync_frequency",
            "facebook_page", "facebook_lead_form", "creation", "modified",
        )
        read_only_fields = ("last_synced_at", "creation", "modified")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get("access_token"):
            data["access_token"] = MASK
        return data

    def validate(self, attrs):
        token = attrs.get("access_token")
        if token and set(token) == {"*"}:
            attrs.pop("access_token")
        return attrs


class LeadSyncSourceViewSet(ManagerOnly, viewsets.ModelViewSet):
    queryset = LeadSyncSource.objects.all()
    serializer_class = LeadSyncSourceSerializer
    lookup_field = "name"
    lookup_value_regex = "[^/]+"
    filterset_fields = ("type", "enabled")

    def _refresh(self, source):
        if source.type == "Facebook" and source.access_token:
            try:
                facebook.refresh_pages(source)
            except facebook.FacebookError as error:
                raise ValidationError(str(error))

    def perform_create(self, serializer):
        source = serializer.save()
        self._refresh(source)

    def perform_update(self, serializer):
        source = serializer.save()
        if "access_token" in serializer.validated_data:
            self._refresh(source)

    @action(detail=True, methods=["post"], url_path="sync-leads")
    def sync_leads(self, request, name=None):
        source = self.get_object()
        try:
            created = facebook.sync_source(source)
        except facebook.FacebookError as error:
            raise ValidationError(str(error))
        return Response({"created": created})


class FacebookPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacebookPage
        fields = ("name", "page_name")


class FacebookPageViewSet(ManagerOnly, viewsets.ReadOnlyModelViewSet):
    queryset = FacebookPage.objects.all()
    serializer_class = FacebookPageSerializer
    lookup_field = "name"
    lookup_value_regex = "[^/]+"
    search_fields = ("name", "page_name")


class QuestionSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = FacebookLeadFormQuestion
        fields = ("name", "key", "label", "type", "mapped_to_crm_field")

    def get_name(self, obj):
        return str(obj.pk)


class FacebookLeadFormSerializer(serializers.ModelSerializer):
    page = serializers.PrimaryKeyRelatedField(read_only=True)
    questions = QuestionSerializer(many=True, required=False)

    class Meta:
        model = FacebookLeadForm
        fields = ("name", "lead_form_name", "page", "questions")

    def update(self, instance, validated_data):
        questions = validated_data.pop("questions", None)
        instance = super().update(instance, validated_data)
        if questions is not None:
            existing = {question.key: question for question in instance.questions.all()}
            for row in questions:
                question = existing.get(row.get("key"))
                if question:
                    question.mapped_to_crm_field = row.get("mapped_to_crm_field", "") or ""
                    question.save(update_fields=["mapped_to_crm_field"])
        return instance


class FacebookLeadFormViewSet(ManagerOnly, viewsets.ModelViewSet):
    queryset = FacebookLeadForm.objects.prefetch_related("questions")
    serializer_class = FacebookLeadFormSerializer
    lookup_field = "name"
    lookup_value_regex = "[^/]+"
    filterset_fields = ("page",)
    http_method_names = ["get", "put", "patch", "head", "options"]


class FailedLeadSyncLogSerializer(serializers.ModelSerializer):
    source = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = FailedLeadSyncLog
        fields = ("name", "source", "type", "lead_data", "traceback", "creation")


class FailedLeadSyncLogViewSet(ManagerOnly, viewsets.ReadOnlyModelViewSet):
    queryset = FailedLeadSyncLog.objects.all()
    serializer_class = FailedLeadSyncLogSerializer
    lookup_field = "name"
    filterset_fields = ("source", "type")

    @action(detail=True, methods=["post"], url_path="retry-sync")
    def retry_sync(self, request, name=None):
        log = self.get_object()
        try:
            facebook.retry_log(log)
        except facebook.FacebookError as error:
            raise ValidationError(str(error))
        return Response({"retried": True})
