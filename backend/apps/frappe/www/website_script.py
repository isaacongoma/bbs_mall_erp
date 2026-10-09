import frappe
from frappe.utils import strip
from frappe.utils.data import add_to_date, get_datetime
from frappe.website.doctype.website_theme.website_theme import get_active_theme

base_template_path = "www/website_script.js"

no_cache = True

cache_headers = {"Cache-Control": "public,max-age=300,stale-while-revalidate=10800"}


def get_context(context):
    should_cache = not_modified_recently(frappe.get_website_settings("modified"))

    website_script = frappe.get_cached_doc("Website Script")
    context.javascript = website_script.javascript or ""
    should_cache &= not_modified_recently(website_script.modified)

    if theme := get_active_theme():
        js = strip(theme.js or "")
        if js:
            context.javascript += "\n" + js
        should_cache &= not_modified_recently(theme.modified)

    if not frappe.conf.developer_mode:
        context["google_analytics_id"] = get_setting("google_analytics_id")
        context["google_analytics_anonymize_ip"] = get_setting("google_analytics_anonymize_ip")

    if should_cache:
        frappe.local.response_headers.update(cache_headers)


def not_modified_recently(timestamp):
    ten_minutes_ago = add_to_date(minutes=-10, as_datetime=True, as_string=False)

    return ten_minutes_ago > get_datetime(timestamp)


def get_setting(field_name):
    """Return value of field_name frok Website Settings or Site Config."""
    website_settings = frappe.get_website_settings(field_name)
    conf = frappe.conf.get(field_name)
    return website_settings or conf
