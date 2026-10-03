from rest_framework import serializers, viewsets

from apps.core.doctype.email_template.email_template import EmailTemplate


class EmailTemplateSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()

    class Meta:
        model = EmailTemplate
        fields = (
            "id", "name", "enabled", "reference_doctype", "subject", "use_html", "response", "response_html",
            "owner", "creation", "modified",
        )
        read_only_fields = ("id", "owner", "creation", "modified")

    def get_owner(self, obj):
        return obj.owner.email if obj.owner else None


class EmailTemplateViewSet(viewsets.ModelViewSet):
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    lookup_field = "name"
    lookup_value_regex = "[^/]+"
    filterset_fields = ("enabled", "reference_doctype", "use_html")
    search_fields = ("name", "subject")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
