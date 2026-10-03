# REST endpoint for the generic Comment doctype -- backs Activities/
# CommentArea.vue's edit/delete calls (frappe.client.set_value /
# frappe.client.delete with doctype: 'Comment'), routed generically through
# resourceFetcher.js's endpointFor(doctype) -> DOCTYPE_ENDPOINTS.
from __future__ import annotations

from rest_framework import serializers, viewsets

from apps.core.models import Comment


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = "__all__"


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    filterset_fields = ("reference_doctype", "reference_name")
