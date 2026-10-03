from rest_framework import serializers

from apps.crm.doctype.holiday.holiday import CRMHoliday
from apps.crm.doctype.holiday_list.holiday_list import CRMHolidayList


class CRMHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMHoliday
        fields = ("date", "weekly_off", "description")


class CRMHolidayListSerializer(serializers.ModelSerializer):
    holidays = CRMHolidaySerializer(many=True, read_only=True)

    class Meta:
        model = CRMHolidayList
        fields = ("name", "from_date", "to_date", "total_holidays", "weekly_off", "holidays")
        read_only_fields = ("name", "total_holidays")
