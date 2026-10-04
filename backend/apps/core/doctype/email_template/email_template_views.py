from django.utils import timezone
from rest_framework import serializers, viewsets

from apps.erpnext.registry import get_model


class EmailTemplateSerializer(serializers.Serializer):
    id = serializers.CharField(source="name", read_only=True)
    name = serializers.CharField()
    enabled = serializers.BooleanField(required=False, default=False)
    reference_doctype = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    subject = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    use_html = serializers.BooleanField(required=False, default=False)
    response = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    response_html = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    owner = serializers.CharField(read_only=True, allow_null=True)
    creation = serializers.DateTimeField(read_only=True)
    modified = serializers.DateTimeField(read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["enabled"] = bool(instance.enabled)
        data["use_html"] = bool(instance.use_html)
        data["owner"] = instance.owner or None
        for key in ("reference_doctype", "subject", "response", "response_html"):
            data[key] = data[key] or ""
        return data

    def create(self, validated_data):
        now = timezone.now()
        email = getattr(self.context["request"].user, "email", "") or ""
        values = {key: (int(value) if isinstance(value, bool) else value) for key, value in validated_data.items()}
        return get_model("Email Template").objects.create(
            owner=email, modified_by=email, creation=now, modified=now, **values
        )

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, int(value) if isinstance(value, bool) else value)
        instance.modified = timezone.now()
        instance.modified_by = getattr(self.context["request"].user, "email", "") or ""
        instance.save()
        return instance


class EmailTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = EmailTemplateSerializer
    lookup_field = "name"
    lookup_value_regex = "[^/]+"
    filterset_fields = ("enabled", "reference_doctype", "use_html")
    search_fields = ("name", "subject")

    def get_queryset(self):
        return get_model("Email Template").objects.all().order_by("-modified")
