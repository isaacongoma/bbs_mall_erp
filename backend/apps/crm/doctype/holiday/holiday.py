# Ported from crm/fcrm/doctype/crm_holiday/crm_holiday.json (frappe/crm, AGPL-3.0)
from django.db import models


class CRMHoliday(models.Model):
    parent = models.ForeignKey("crm.CRMHolidayList", on_delete=models.CASCADE, related_name="holidays")
    idx = models.PositiveIntegerField(default=0)

    date = models.DateField()
    weekly_off = models.BooleanField(default=False)
    description = models.TextField()

    class Meta:
        app_label = "crm"
        db_table = "crm_holiday"
        verbose_name = "CRM Holiday"
        ordering = ["idx"]
