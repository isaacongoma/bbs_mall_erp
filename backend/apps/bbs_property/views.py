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


def authorised(token):
    from apps.bbs_property.property_management import mpesa

    def check():
        settings = frappe.get_single("Property Settings")
        expected = mpesa.callback_token(settings)
        return bool(expected) and constant_time_compare(expected, token)

    return as_system(check)


@csrf_exempt
@require_POST
def mpesa_callback(request, token, kind):
    from apps.bbs_property.property_management import mpesa

    if not authorised(token):
        return JsonResponse({"ResultCode": 1, "ResultDesc": "Rejected"}, status=403)
    try:
        payload = json.loads(request.body or b"{}")
    except ValueError:
        return JsonResponse({"ResultCode": 1, "ResultDesc": "Invalid payload"}, status=400)
    if kind == "stk":
        result = as_system(mpesa.handle_stk_callback, payload)
    elif kind == "c2b":
        result = as_system(mpesa.handle_c2b, payload)
    elif kind == "validate":
        result = {"ResultCode": 0, "ResultDesc": "Accepted"}
    else:
        return JsonResponse({"ResultCode": 1, "ResultDesc": "Unknown"}, status=404)
    return JsonResponse(result)
