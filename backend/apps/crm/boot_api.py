# Ported from crm/www/crm.py::get_boot() (frappe/crm, AGPL-3.0). The original
# serves this as Jinja boot context on the desk page load, or (in dev mode,
# which is the shape this port uses -- see vite.config.js's jinjaBootData:
# false) via a whitelisted `get_context_for_dev` RPC that main.js calls once
# and copies onto `window`. Fields with no Django/non-Frappe equivalent
# (bbs_erp_version, csrf_token, is_fc_site, socketio -- no realtime transport
# is wired up yet, see src/socket.js) are given inert defaults rather than
# left out, since ported frontend code reads them optimistically.
from __future__ import annotations


def get_boot(user) -> dict:
    return {
        "bbs_erp_version": None,
        "default_route": "/crm",
        "site_name": "bbs-erp",
        "socketio_port": None,
        "read_only_mode": False,
        "csrf_token": "",
        "setup_complete": 1,
        "sysdefaults": {
            "date_format": "yyyy-mm-dd",
            "time_format": "HH:mm:ss",
            "currency": "USD",
            "number_format": "#,###.##",
            "float_precision": 3,
            "currency_precision": 2,
            "rounding_method": "Banker's Rounding (legacy)",
        },
        "is_demo_site": False,
        "demo_data_created": False,
        "is_fc_site": False,
        "translated_doctypes": [],
        "translated_messages": {},
        "timezone": {"system": "UTC", "user": "UTC"},
        "state_options": {},
    }
