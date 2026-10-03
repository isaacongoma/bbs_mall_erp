from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.crm.dashboard_api import get_chart_options, get_dashboard, get_chart, reset_to_default


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chart_options_view(request):
    return Response(get_chart_options())
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    from_date = request.query_params.get("from_date")
    to_date = request.query_params.get("to_date")
    user = request.query_params.get("user")
    return Response(get_dashboard(from_date, to_date, user))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chart_view(request):
    name = request.query_params.get("name")
    type_ = request.query_params.get("type")
    from_date = request.query_params.get("from_date")
    to_date = request.query_params.get("to_date")
    user = request.query_params.get("user")
    return Response(get_chart(name, type_, from_date, to_date, user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reset_to_default_view(request):
    reset_to_default()
    return Response({"message": "Dashboard reset to default"})
