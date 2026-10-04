# Ported from Frappe's core "System Settings" doctype (frappe/frappe, MIT),
# scoped to the fields Settings/DefaultsSettings.vue actually reads/writes.
# A Single doctype there (one fixed record); modeled the same way this port
# already models FCRM Settings -- a singleton row via get_solo().
from django.db import models

CURRENCY_PRECISION_CHOICES = [("", "")] + [(str(n), str(n)) for n in range(10)]
FLOAT_PRECISION_CHOICES = CURRENCY_PRECISION_CHOICES

NUMBER_FORMAT_CHOICES = [(c, c) for c in (
    "#,###.##", "#.###,##", "# ###.##", "#,##,###.##", "#.##,###", "#,###.###", "#.###", "#,###",
)]

DATE_FORMAT_CHOICES = [(c, c) for c in (
    "yyyy-mm-dd", "dd-mm-yyyy", "dd/mm/yyyy", "dd.mm.yyyy", "mm/dd/yyyy",
    "mm-dd-yyyy", "month d, yyyy", "day, month d, yyyy",
)]

TIME_FORMAT_CHOICES = [(c, c) for c in ("HH:mm:ss", "HH:mm", "hh:mm:ss a", "hh:mm a")]


class SystemSettings(models.Model):
    doctype_label = "System Settings"

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    currency = models.ForeignKey(
        "erpnext.Currency", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    currency_precision = models.CharField(max_length=2, choices=CURRENCY_PRECISION_CHOICES, blank=True)
    float_precision = models.CharField(max_length=2, choices=FLOAT_PRECISION_CHOICES, blank=True)
    number_format = models.CharField(max_length=20, choices=NUMBER_FORMAT_CHOICES, default="#,###.##")
    date_format = models.CharField(max_length=20, choices=DATE_FORMAT_CHOICES, default="yyyy-mm-dd")
    time_format = models.CharField(max_length=20, choices=TIME_FORMAT_CHOICES, default="HH:mm:ss")

    class Meta:
        app_label = "core"
        db_table = "system_settings"
        verbose_name = "System Settings"

    def __str__(self):
        return "System Settings"

    @classmethod
    def get_solo(cls) -> "SystemSettings":
        obj, _ = cls.objects.get_or_create(id=1)
        return obj
