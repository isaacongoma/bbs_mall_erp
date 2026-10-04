import json
from pathlib import Path

from django.db import migrations


def seed_currencies(apps, schema_editor):
    Currency = apps.get_model("erpnext", "Currency")
    root = Path(__file__).resolve().parents[4]
    path = root / "vendor" / "frappe" / "frappe" / "geo" / "country_info.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    seen = set()
    rows = []
    for country in data.values():
        code = country.get("currency")
        if not code or code in seen:
            continue
        seen.add(code)
        rows.append(
            Currency(
                name=code,
                currency_name=code,
                fraction=country.get("currency_fraction") or "",
                symbol=country.get("currency_symbol") or "",
                fraction_units=country.get("currency_fraction_units"),
                smallest_currency_fraction_value=country.get("smallest_currency_fraction_value"),
                number_format=country.get("number_format") or "",
            )
        )
    Currency.objects.bulk_create(rows, ignore_conflicts=True)


class Migration(migrations.Migration):
    dependencies = [
        ("erpnext", "0002_company"),
    ]

    operations = [
        migrations.RunPython(seed_currencies, migrations.RunPython.noop),
    ]
