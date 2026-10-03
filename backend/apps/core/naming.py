"""Generates sequential IDs from a naming-series pattern.

e.g. "CRM-LEAD-.YYYY.-" -> "CRM-LEAD-2026-00001"
     "CONTACT-"          -> "CONTACT-00001"
"""

from django.db import transaction
from django.utils import timezone


def make_autoname(model, series: str) -> str:
    year = timezone.now().year
    prefix = series.replace(".YYYY.", str(year))

    with transaction.atomic():
        last = (
            model.objects.select_for_update()
            .filter(name__startswith=prefix)
            .order_by("-name")
            .values_list("name", flat=True)
            .first()
        )
        next_seq = 1
        if last:
            tail = last[len(prefix) :]
            if tail.isdigit():
                next_seq = int(tail) + 1
        return f"{prefix}{next_seq:05d}"
