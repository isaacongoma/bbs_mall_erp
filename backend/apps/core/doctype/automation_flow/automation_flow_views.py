from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.automation_engine.registry import clear_automation_cache
from apps.core.doctype.automation_flow.automation_flow import AutomationAction, AutomationFlow
from apps.core.doctype.automation_flow.automation_flow_serializer import AutomationFlowSerializer

FLOW_FIELDS = (
    "title", "document_type", "enabled", "disabled_reason", "trigger_type", "trigger_field",
    "from_value", "to_value", "custom_event", "date_field", "date_offset", "date_direction",
    "cron_expression", "filters", "condition", "relationships", "revalidate_on_run",
    "run_as", "stop_on_error", "throttle_per_minute",
)


def _save(flow: AutomationFlow):
    try:
        flow.save()
    except DjangoValidationError as exc:
        raise ValidationError(exc.messages if hasattr(exc, "messages") else str(exc)) from exc
    clear_automation_cache(flow.document_type)


def _set_action_rows(flow: AutomationFlow, actions: list):
    flow.action_rows.all().delete()
    for idx, row in enumerate(actions or []):
        AutomationAction.objects.create(
            flow=flow,
            idx=row.get("idx", idx),
            step_key=row.get("step_key") or f"step_{idx}",
            step_type=row.get("step_type") or "Action",
            action_type=row.get("action_type") or "",
            target=row.get("target") or "trigger",
            output_alias=row.get("output_alias") or "",
            params=row.get("params") or "",
            step_condition=row.get("step_condition") or "",
            related_condition=row.get("related_condition") or "",
            parent_step=row.get("parent_step") or None,
            branch=row.get("branch") or "",
        )


class AutomationFlowViewSet(viewsets.ModelViewSet):
    queryset = AutomationFlow.objects.select_related("automation_user", "owner").prefetch_related("action_rows")
    serializer_class = AutomationFlowSerializer
    lookup_field = "name"
    filterset_fields = ("document_type", "enabled", "trigger_type")

    def create(self, request, *args, **kwargs):
        data = request.data
        flow = AutomationFlow(owner=request.user, **{f: data.get(f) for f in FLOW_FIELDS if f in data})
        _coerce_bools(flow, data)
        if "automation_user" in data:
            flow.automation_user_id = data["automation_user"] or None
        _save(flow)
        _set_action_rows(flow, data.get("actions"))
        return Response(self.get_serializer(flow).data, status=201)

    def update(self, request, *args, **kwargs):
        flow = self.get_object()
        data = request.data
        for field in FLOW_FIELDS:
            if field in data:
                setattr(flow, field, data[field])
        _coerce_bools(flow, data)
        if "automation_user" in data:
            flow.automation_user_id = data["automation_user"] or None
        _save(flow)
        if "actions" in data:
            _set_action_rows(flow, data.get("actions"))
        return Response(self.get_serializer(flow).data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        document_type = instance.document_type
        instance.delete()
        clear_automation_cache(document_type)


def _coerce_bools(flow, data):
    for field in ("enabled", "revalidate_on_run", "stop_on_error"):
        if field in data:
            setattr(flow, field, bool(data[field]))
