from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.crm.doctype.holiday.holiday import CRMHoliday
from apps.crm.doctype.holiday_list.holiday_list import CRMHolidayList
from apps.crm.doctype.holiday_list.holiday_list_serializer import CRMHolidayListSerializer


def _save(holiday_list: CRMHolidayList):
    try:
        holiday_list.save()
    except DjangoValidationError as exc:
        raise ValidationError(exc.messages if hasattr(exc, "messages") else str(exc)) from exc


def _set_holiday_rows(holiday_list: CRMHolidayList, rows: list):
    holiday_list.holidays.all().delete()
    for idx, row in enumerate(rows or []):
        if row.get("date"):
            CRMHoliday.objects.create(
                parent=holiday_list, idx=idx, date=row["date"],
                weekly_off=bool(row.get("weekly_off")), description=row.get("description") or "",
            )
    holiday_list.recalc_total_holidays()


class CRMHolidayListViewSet(viewsets.ModelViewSet):
    queryset = CRMHolidayList.objects.prefetch_related("holidays")
    serializer_class = CRMHolidayListSerializer
    lookup_field = "name"

    def create(self, request, *args, **kwargs):
        data = request.data
        holiday_list = CRMHolidayList(
            name=data.get("name") or data.get("holiday_list_name") or "",
            from_date=data.get("from_date"),
            to_date=data.get("to_date"),
            weekly_off=data.get("weekly_off") or "",
        )
        _save(holiday_list)
        if "holidays" in data:
            _set_holiday_rows(holiday_list, data.get("holidays"))
        return Response(self.get_serializer(holiday_list).data, status=201)

    def update(self, request, *args, **kwargs):
        holiday_list = self.get_object()
        data = request.data
        for field in ("from_date", "to_date", "weekly_off"):
            if field in data:
                setattr(holiday_list, field, data[field])
        _save(holiday_list)
        if "holidays" in data:
            _set_holiday_rows(holiday_list, data.get("holidays"))
        return Response(self.get_serializer(holiday_list).data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    # Ported from crm_holiday_list.py's get_weekly_off_dates() -- the
    # "Add to Holidays" button's whitelisted RPC. No Vue UI calls this yet
    # (holiday list creation/editing is desk-only, same as upstream), but
    # it's exposed for parity and any future frontend to call directly.
    @action(detail=True, methods=["post"], url_path="weekly-off-dates")
    def weekly_off_dates(self, request, name=None):
        holiday_list = self.get_object()
        try:
            dates = holiday_list.get_weekly_off_dates()
        except DjangoValidationError as exc:
            raise ValidationError(exc.messages if hasattr(exc, "messages") else str(exc)) from exc
        existing = list(holiday_list.holidays.all())
        last_idx = max((row.idx for row in existing), default=0)
        for offset, date in enumerate(dates):
            CRMHoliday.objects.create(
                parent=holiday_list, idx=last_idx + offset + 1, date=date,
                weekly_off=True, description=holiday_list.weekly_off,
            )
        holiday_list.recalc_total_holidays()
        return Response(self.get_serializer(holiday_list).data)
