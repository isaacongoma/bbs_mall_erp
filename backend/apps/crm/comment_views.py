from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers, viewsets

from apps.core.identity import user_pk
from apps.crm.comment_api import create_comment
from apps.erpnext.registry import get_model


class CommentSerializer(serializers.Serializer):
    id = serializers.CharField(source="name", read_only=True)
    reference_doctype = serializers.CharField()
    reference_name = serializers.CharField()
    content = serializers.CharField(allow_blank=True, required=False)
    owner = serializers.SerializerMethodField()
    creation = serializers.DateTimeField(read_only=True)
    modified = serializers.DateTimeField(read_only=True)

    def get_owner(self, obj):
        return user_pk(obj.owner)

    def create(self, validated_data):
        request = self.context.get("request")
        return create_comment(
            validated_data["reference_doctype"],
            validated_data["reference_name"],
            validated_data.get("content", ""),
            getattr(request, "user", None),
        )

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.modified = timezone.now()
        instance.save()
        return instance


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    filterset_fields = ("reference_doctype", "reference_name")

    def get_queryset(self):
        return get_model("Comment").objects.filter(comment_type="Comment").order_by("creation")
