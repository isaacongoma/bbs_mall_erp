from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.crm.doctype.service_day.service_day import CRMServiceDay
from apps.crm.doctype.service_level_agreement.service_level_agreement import CRMServiceLevelAgreement
from apps.crm.doctype.service_level_agreement.service_level_agreement_serializer import (
    CRMServiceLevelAgreementSerializer,
)
from apps.crm.doctype.service_level_priority.service_level_priority import CRMServiceLevelPriority


def _save(sla: CRMServiceLevelAgreement):
    try:
        sla.save()
    except DjangoValidationError as exc:
        raise ValidationError(exc.messages if hasattr(exc, "messages") else str(exc)) from exc


def _set_child_rows(sla: CRMServiceLevelAgreement, data: dict):
    if "working_hours" in data:
        sla.working_hours.all().delete()
        for idx, row in enumerate(data.get("working_hours") or []):
            if row.get("workday") and row.get("start_time") and row.get("end_time"):
                CRMServiceDay.objects.create(
                    parent=sla, idx=idx, workday=row["workday"],
                    start_time=row["start_time"], end_time=row["end_time"],
                )

    if "priorities" in data:
        sla.priorities.all().delete()
        for idx, row in enumerate(data.get("priorities") or []):
            if row.get("priority"):
                CRMServiceLevelPriority.objects.create(
                    parent=sla, idx=idx, priority_id=row["priority"],
                    default_priority=bool(row.get("default_priority")),
                    first_response_time=timedelta(seconds=int(row.get("first_response_time") or 0)),
                )


class CRMServiceLevelAgreementViewSet(viewsets.ModelViewSet):
    queryset = CRMServiceLevelAgreement.objects.prefetch_related("priorities", "working_hours")
    serializer_class = CRMServiceLevelAgreementSerializer
    lookup_field = "name"
    filterset_fields = ("apply_on", "enabled", "default")

    def create(self, request, *args, **kwargs):
        data = request.data
        sla = CRMServiceLevelAgreement(
            sla_name=data.get("sla_name") or "",
            apply_on=data.get("apply_on") or "CRM Lead",
            enabled=bool(data.get("enabled", True)),
            default=bool(data.get("default")),
            start_date=data.get("start_date") or None,
            end_date=data.get("end_date") or None,
            condition=data.get("condition") or "",
            condition_json=data.get("condition_json") or "",
            rolling_responses=bool(data.get("rolling_responses")),
            holiday_list_id=data.get("holiday_list") or None,
        )
        _save(sla)
        _set_child_rows(sla, data)
        return Response(self.get_serializer(sla).data, status=201)

    def update(self, request, *args, **kwargs):
        sla = self.get_object()
        data = request.data
        for field in ("sla_name", "apply_on", "condition", "condition_json"):
            if field in data:
                setattr(sla, field, data[field] or "")
        for field in ("enabled", "default", "rolling_responses"):
            if field in data:
                setattr(sla, field, bool(data[field]))
        for field in ("start_date", "end_date"):
            if field in data:
                setattr(sla, field, data[field] or None)
        if "holiday_list" in data:
            sla.holiday_list_id = data["holiday_list"] or None
        _save(sla)
        _set_child_rows(sla, data)
        return Response(self.get_serializer(sla).data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)
