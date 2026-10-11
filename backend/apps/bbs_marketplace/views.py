import json

import frappe
from django.http import JsonResponse
from django.utils.crypto import constant_time_compare
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from apps.frappe.runtime import session


def as_system(function, *args):
    previous = getattr(session, "user", None)
    session.user = "Administrator"
    try:
        return function(*args)
    finally:
        session.user = previous


def _payload(request):
    try:
        return json.loads(request.body or b"{}")
    except ValueError:
        return None


@csrf_exempt
@require_POST
def courier_webhook(request, courier, token):
    from apps.bbs_marketplace.marketplace import extras

    def check():
        expected = frappe.db.get_value("Courier", courier, "webhook_token")
        return bool(expected) and constant_time_compare(expected, token)

    if not as_system(check):
        return JsonResponse({"ok": False}, status=403)
    payload = _payload(request)
    if payload is None:
        return JsonResponse({"ok": False}, status=400)
    updated = as_system(extras.apply_courier_update, courier, payload)
    return JsonResponse({"ok": True, "updated": updated})
