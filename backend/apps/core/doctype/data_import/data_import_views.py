import json

from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.doctype.data_import import importer
from apps.core.doctype.data_import.data_import import DataImport
from apps.core.doctype.data_import.data_import_serializer import DataImportSerializer


class DataImportViewSet(viewsets.ModelViewSet):
    queryset = DataImport.objects.all()
    serializer_class = DataImportSerializer
    lookup_field = "name"
    filterset_fields = ("status", "reference_doctype", "import_type")
    ordering_fields = ("creation", "modified")


def _get_import(request) -> DataImport:
    name = request.query_params.get("data_import") or request.data.get("data_import")
    return DataImport.objects.get(pk=name)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def preview_view(request):
    try:
        return Response(importer.get_preview(_get_import(request)))
    except (importer.ImportSourceError, DataImport.DoesNotExist) as error:
        return Response({"detail": str(error)}, status=400)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_view(request):
    try:
        data_import = _get_import(request)
        importer.run_import(data_import, request.user)
    except (importer.ImportSourceError, DataImport.DoesNotExist) as error:
        return Response({"detail": str(error)}, status=400)
    return Response({"status": data_import.status})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def logs_view(request):
    try:
        return Response(importer.get_logs(_get_import(request)))
    except DataImport.DoesNotExist as error:
        return Response({"detail": str(error)}, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def template_view(request):
    doctype = request.query_params.get("doctype", "")
    try:
        export_fields = json.loads(request.query_params.get("export_fields") or "{}")
        content = importer.build_template(doctype, export_fields)
    except (importer.ImportSourceError, json.JSONDecodeError) as error:
        return Response({"detail": str(error)}, status=400)
    response = HttpResponse(content, content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="%s.csv"' % doctype
    return response
