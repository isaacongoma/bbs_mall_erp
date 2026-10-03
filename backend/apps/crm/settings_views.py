# Django REST endpoint for FCRM Settings -- a Frappe "Single" doctype (one
# row, no list view, doc name == doctype name), modeled as a singleton (see
# apps/crm/doctype/settings/settings.py::get_solo()). Only exposes what the
# ported frontend currently reads (stores/settings.js's getSettings()).
from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.crm.doctype.settings.settings import FCRMSettings

# Ported from crm/hooks.py's standard_dropdown_items (frappe/crm, AGPL-3.0),
# seeded once into the real CRM Dropdown Item child table (see migration
# 0023) the same way crm/install.py's add_standard_dropdown_items() seeds it
# on a fresh Frappe install -- HomeActions.vue's Grid edits real rows from
# here on, this is only the one-time seed shape.
STANDARD_DROPDOWN_ITEMS = [
    {"name1": "app_selector", "label": "Apps", "type": "Route", "route": "#", "is_standard": True},
    {"name1": "settings", "label": "Settings", "type": "Route", "icon": "settings", "route": "#", "is_standard": True},
    {"name1": "login_to_fc", "label": "Login to Frappe Cloud", "type": "Route", "route": "#", "is_standard": True},
    {"name1": "about", "label": "About", "type": "Route", "icon": "info", "route": "#", "is_standard": True},
    {"name1": "separator", "label": "", "type": "Separator", "is_standard": True},
    {"name1": "logout", "label": "Log out", "type": "Route", "icon": "log-out", "route": "#", "is_standard": True},
]


def _serialize_dropdown_item(row) -> dict:
    return {
        "name1": row.name1, "label": row.label, "type": row.type, "route": row.route,
        "icon": row.icon, "hidden": row.hidden, "is_standard": row.is_standard,
        "open_in_new_window": row.open_in_new_window,
    }


def _serialize_settings(doc: FCRMSettings) -> dict:
    rows = list(doc.dropdown_items_rows.all())
    return {
        "name": "FCRM Settings",
        "currency": doc.currency,
        "enable_forecasting": doc.enable_forecasting,
        "auto_update_expected_deal_value": doc.auto_update_expected_deal_value,
        "enable_sales_hierarchy": doc.enable_sales_hierarchy,
        "service_provider": doc.service_provider,
        "brand_name": doc.brand_name,
        "brand_logo": doc.brand_logo,
        "favicon": doc.favicon,
        "dropdown_items": [_serialize_dropdown_item(r) for r in rows] if rows else STANDARD_DROPDOWN_ITEMS,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def get_settings(request):
    # stores/settings.js's _settings resource is a module-level auto-fetch
    # (fires the moment the module is first imported, before Vue Router even
    # mounts a route) -- reached while the app shell is still showing Login,
    # not yet authenticated. Same reasoning as get_boot's AllowAny.
    return Response(_serialize_settings(FCRMSettings.get_solo()))


@api_view(["PATCH", "POST"])
@permission_classes([IsAuthenticated])
def update_settings(request):
    from apps.crm.doctype.dropdown_item.dropdown_item import CRMDropdownItem

    doc = FCRMSettings.get_solo()
    fields = request.data or {}
    for field in (
        "currency", "enable_forecasting", "auto_update_expected_deal_value", "enable_sales_hierarchy",
        "service_provider", "brand_name", "brand_logo", "favicon",
    ):
        if field in fields:
            setattr(doc, field, fields[field])
    doc.save()

    # HomeActions.vue's Grid sends the whole dropdown_items array on every
    # save (a child table replace, not a diff) -- rebuild the rows to match.
    if "dropdown_items" in fields:
        doc.dropdown_items_rows.all().delete()
        for idx, item in enumerate(fields["dropdown_items"] or []):
            CRMDropdownItem.objects.create(
                parent_settings=doc, idx=idx,
                label=item.get("label") or "", type=item.get("type") or "Route",
                route=item.get("route") or "", icon=item.get("icon") or "",
                hidden=bool(item.get("hidden")), is_standard=bool(item.get("is_standard")),
                open_in_new_window=bool(item.get("open_in_new_window")),
                name1=item.get("name1") or "",
            )

    return Response(_serialize_settings(doc))
