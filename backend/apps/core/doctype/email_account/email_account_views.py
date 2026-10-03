from rest_framework import serializers, viewsets

from apps.core.doctype.email_account.email_account import EmailAccount

MASK = "*****"
SECRET_FIELDS = ("password", "api_secret")


class EmailAccountSerializer(serializers.ModelSerializer):
    name = serializers.CharField(read_only=True)

    class Meta:
        model = EmailAccount
        fields = (
            "id", "name", "email_account_name", "email_id", "service", "password", "api_key", "api_secret",
            "frappe_mail_site", "enable_incoming", "enable_outgoing", "default_incoming", "default_outgoing",
            "create_lead_from_incoming_email", "signature", "creation", "modified",
        )
        read_only_fields = ("id", "creation", "modified")
        extra_kwargs = {"password": {"required": False}, "api_secret": {"required": False}}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for field in SECRET_FIELDS:
            if data.get(field):
                data[field] = MASK
        return data

    def validate(self, attrs):
        for field in SECRET_FIELDS:
            if attrs.get(field) and set(attrs[field]) == {"*"}:
                attrs.pop(field)
        return attrs


class EmailAccountViewSet(viewsets.ModelViewSet):
    queryset = EmailAccount.objects.all()
    serializer_class = EmailAccountSerializer
    lookup_field = "email_account_name"
    lookup_value_regex = "[^/]+"
    filterset_fields = ("enable_outgoing", "enable_incoming", "service")
    search_fields = ("email_account_name", "email_id")
