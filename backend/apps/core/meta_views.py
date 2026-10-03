from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.meta import get_doctype_meta


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def doctype_meta(request, doctype: str):
    meta = get_doctype_meta(doctype)
    if meta is None:
        raise NotFound(f"Unknown doctype: {doctype}")
    return Response(meta)
