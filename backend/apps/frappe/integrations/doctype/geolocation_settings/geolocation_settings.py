import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_url

from .providers.geoapify import Geoapify
from .providers.here import Here
from .providers.nomatim import Nomatim


class GeolocationSettings(Document):
    doctype = 'Geolocation Settings'

    _DOCTYPE_NAME = "Geolocation Settings"


    pass


@frappe.whitelist()
def autocomplete(txt: str) -> list[dict]:
    if not txt:
        return []

    settings = frappe.get_single("Geolocation Settings")
    if not settings.enable_address_autocompletion:
        return []

    if settings.provider == "Geoapify":
        provider = Geoapify(settings.get_password("api_key"), frappe.local.lang)
    elif settings.provider == "Nomatim":
        provider = Nomatim(
            base_url=settings.base_url,
            referer=get_url(),
            lang=frappe.local.lang,
        )
    elif settings.provider == "HERE":
        provider = Here(settings.get_password("api_key"), frappe.local.lang)
    else:
        frappe.throw(_("This geolocation provider is not supported yet."))

    return list(provider.autocomplete(txt))
