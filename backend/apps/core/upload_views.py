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

from django.core.files.storage import default_storage
from django.utils import timezone

from apps.core.identity import user_email
from apps.erpnext.registry import get_model
from apps.frappe.utils import generate_hash


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_file(request):
    upload = request.FILES.get("file")
    if upload is None:
        return Response({"message": "No file provided"}, status=400)

    now = timezone.now()
    stored_path = default_storage.save(f"uploads/{now:%Y/%m}/{upload.name}", upload)
    email = user_email(request.user) or ""
    doc = get_model("File").objects.create(
        name=generate_hash(length=10),
        file_name=upload.name,
        file_url=default_storage.url(stored_path),
        file_size=upload.size,
        is_private=1 if request.data.get("is_private", "1") == "1" else 0,
        folder=request.data.get("folder") or "Home",
        attached_to_doctype=request.data.get("doctype") or "",
        attached_to_name=request.data.get("docname") or "",
        attached_to_field=request.data.get("fieldname") or "",
        owner=email,
        modified_by=email,
        creation=now,
        modified=now,
    )
    return Response({
        "message": {
            "name": doc.name,
            "file_name": doc.file_name,
            "file_url": doc.file_url,
            "is_private": bool(doc.is_private),
        }
    })
