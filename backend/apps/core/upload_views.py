# Ported from Frappe's frappe.handler.upload_file -- the frontend's
# FileUploadHandler (frappe-ui/src/utils/fileUploadHandler.ts) posts a raw
# multipart XHR straight to the literal path '/api/method/upload_file' (not
# configurable per-call, and not routed through resourceFetcher/djangoResource
# Fetcher since it bypasses fetch() entirely) -- so this is served at that
# same literal path in config/urls.py rather than under /api/crm/.
from __future__ import annotations

from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.models import FileAttachment


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_file(request):
    upload = request.FILES.get("file")
    if upload is None:
        return Response({"message": "No file provided"}, status=400)

    doc = FileAttachment.objects.create(
        file_name=upload.name,
        file=upload,
        is_private=request.data.get("is_private", "1") == "1",
        folder=request.data.get("folder") or "Home",
        attached_to_doctype=request.data.get("doctype") or "",
        attached_to_name=request.data.get("docname") or "",
        attached_to_field=request.data.get("fieldname") or "",
        owner=request.user,
    )
    return Response({
        "message": {
            "name": str(doc.pk),
            "file_name": doc.file_name,
            "file_url": doc.file_url,
            "is_private": doc.is_private,
        }
    })
