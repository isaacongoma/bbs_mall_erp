from django.utils import timezone
from rest_framework import serializers

from apps.core.identity import user_email
from apps.erpnext.registry import get_model
from apps.frappe.utils import generate_hash

TEXT_FIELDS = ("reference_doctype", "import_type", "status", "import_file", "google_sheets_url", "template_options")


class DataImportSerializer(serializers.Serializer):
    name = serializers.CharField(read_only=True)
    reference_doctype = serializers.CharField()
    import_type = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False, allow_blank=True)
    import_file = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    google_sheets_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    template_options = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    mute_emails = serializers.BooleanField(required=False)
    creation = serializers.DateTimeField(read_only=True)
    modified = serializers.DateTimeField(read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for field in TEXT_FIELDS:
            data[field] = data.get(field) or ""
        data["mute_emails"] = bool(instance.mute_emails)
        return data

    def _stored(self, validated_data):
        return {key: (int(value) if isinstance(value, bool) else value) for key, value in validated_data.items()}

    def create(self, validated_data):
        now = timezone.now()
        email = user_email(getattr(self.context.get("request"), "user", None)) or "Administrator"
        return get_model("Data Import").objects.create(
            name="DI-" + generate_hash(length=10), owner=email, modified_by=email, creation=now, modified=now,
            **self._stored(validated_data),
        )

    def update(self, instance, validated_data):
        for key, value in self._stored(validated_data).items():
            setattr(instance, key, value)
        instance.modified = timezone.now()
        instance.save()
        return instance
