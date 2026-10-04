from django.utils import timezone
from rest_framework import serializers, viewsets

from apps.erpnext.registry import get_model

MASK = "*****"
SECRET_FIELDS = ("password", "api_secret")
FLAG_FIELDS = (
    "enable_incoming",
    "enable_outgoing",
    "default_incoming",
    "default_outgoing",
    "create_lead_from_incoming_email",
)
TEXT_FIELDS = ("email_id", "service", "password", "api_key", "api_secret", "frappe_mail_site", "signature")


class EmailAccountSerializer(serializers.Serializer):
    id = serializers.CharField(source="name", read_only=True)
    name = serializers.CharField(read_only=True)
    email_account_name = serializers.CharField()
    email_id = serializers.EmailField()
    service = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    password = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    api_key = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    api_secret = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    frappe_mail_site = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    enable_incoming = serializers.BooleanField(required=False)
    enable_outgoing = serializers.BooleanField(required=False)
    default_incoming = serializers.BooleanField(required=False)
    default_outgoing = serializers.BooleanField(required=False)
    create_lead_from_incoming_email = serializers.BooleanField(required=False)
    signature = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    creation = serializers.DateTimeField(read_only=True)
    modified = serializers.DateTimeField(read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for field in FLAG_FIELDS:
            data[field] = bool(getattr(instance, field, 0))
        for field in TEXT_FIELDS:
            data[field] = getattr(instance, field, "") or ""
        for field in SECRET_FIELDS:
            if data.get(field):
                data[field] = MASK
        return data

    def validate(self, attrs):
        for field in SECRET_FIELDS:
            if attrs.get(field) and set(attrs[field]) == {"*"}:
                attrs.pop(field)
        return attrs

    def _stored(self, validated_data):
        return {key: (int(value) if isinstance(value, bool) else value) for key, value in validated_data.items()}

    def _enforce_single_default(self, instance):
        others = get_model("Email Account").objects.exclude(pk=instance.pk)
        if instance.default_incoming:
            others.filter(default_incoming=1).update(default_incoming=0)
        if instance.default_outgoing:
            others.filter(default_outgoing=1).update(default_outgoing=0)

    def create(self, validated_data):
        now = timezone.now()
        email = getattr(self.context["request"].user, "email", "") or ""
        values = self._stored(validated_data)
        instance = get_model("Email Account").objects.create(
            name=values["email_account_name"], owner=email, modified_by=email, creation=now, modified=now, **values
        )
        self._enforce_single_default(instance)
        return instance

    def update(self, instance, validated_data):
        for key, value in self._stored(validated_data).items():
            setattr(instance, key, value)
        instance.modified = timezone.now()
        instance.modified_by = getattr(self.context["request"].user, "email", "") or ""
        instance.save()
        self._enforce_single_default(instance)
        return instance


class EmailAccountViewSet(viewsets.ModelViewSet):
    serializer_class = EmailAccountSerializer
    lookup_field = "email_account_name"
    lookup_value_regex = "[^/]+"
    filterset_fields = ("enable_outgoing", "enable_incoming", "service")
    search_fields = ("email_account_name", "email_id")

    def get_queryset(self):
        return get_model("Email Account").objects.all().order_by("-modified")
