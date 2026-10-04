import frappe
import frappe.defaults
from frappe import _
from frappe.model import no_value_fields
from frappe.model.document import Document
from frappe.utils import cint, today


class SystemSettings(Document):
    doctype = 'System Settings'

    _DOCTYPE_NAME = "System Settings"


    def validate(self):
        from frappe.twofactor import toggle_two_factor_auth

        enable_password_policy = cint(self.enable_password_policy)
        minimum_password_score = cint(getattr(self, "minimum_password_score", 0))
        if enable_password_policy and minimum_password_score <= 0:
            frappe.throw(_("Please select Minimum Password Score"))
        elif not enable_password_policy:
            self.minimum_password_score = ""

        if self.session_expiry:
            parts = self.session_expiry.split(":")
            if len(parts) != 2 or not (cint(parts[0]) or cint(parts[1])):
                frappe.throw(_("Session Expiry must be in format {0}").format("hh:mm"))

        if self.has_value_changed("enable_two_factor_auth"):
            if self.enable_two_factor_auth:
                if self.two_factor_method == "SMS":
                    if not frappe.db.get_single_value("SMS Settings", "sms_gateway_url"):
                        frappe.throw(
                            _(
                                "Please setup SMS before setting it as an authentication method, via SMS Settings"
                            )
                        )
                toggle_two_factor_auth(True, roles=["All"])
            else:
                self.bypass_2fa_for_retricted_ip_users = 0
                self.bypass_restrict_ip_check_if_2fa_enabled = 0

        frappe.flags.update_last_reset_password_date = False
        if self.force_user_to_reset_password and not cint(
            frappe.db.get_single_value("System Settings", "force_user_to_reset_password")
        ):
            frappe.flags.update_last_reset_password_date = True

        self.validate_user_pass_login()
        self.validate_backup_limit()
        self.validate_file_extensions()
        self.validate_otp_sms_template()

        if not self.link_field_results_limit:
            self.link_field_results_limit = 10

        if self.link_field_results_limit > 50:
            self.link_field_results_limit = 50
            label = self.meta.get_translated_label("link_field_results_limit")
            frappe.msgprint(
                _("{0} can not be more than {1}").format(label, 50), alert=True, indicator="yellow"
            )
        self.validate_snapshot_reports()

    def validate_otp_sms_template(self):
        if not self.enable_two_factor_auth or self.two_factor_method != "SMS" or not self.otp_sms_template:
            return

        if "{{otp}}" not in self.otp_sms_template.replace(" ", ""):
            frappe.throw(
                _("OTP SMS Template must contain <code>{0}</code> placeholder to insert the OTP.").format(
                    "{{otp}}"
                )
            )

    def validate_user_pass_login(self):
        if not self.disable_user_pass_login:
            return

        social_login_enabled = frappe.db.exists("Social Login Key", {"enable_social_login": 1})
        ldap_enabled = frappe.db.get_single_value("LDAP Settings", "enabled")

        if not (social_login_enabled or ldap_enabled or self.login_with_email_link):
            frappe.throw(
                _(
                    "Please enable atleast one Social Login Key or LDAP or Login With Email Link before disabling username/password based login."
                )
            )

    def validate_backup_limit(self):
        if not self.backup_limit or self.backup_limit < 1:
            frappe.msgprint(_("Number of backups must be greater than zero."), alert=True)
            self.backup_limit = 1

    def validate_file_extensions(self):
        if not self.allowed_file_extensions:
            return

        self.allowed_file_extensions = "\n".join(
            ext.strip().upper() for ext in self.allowed_file_extensions.strip().splitlines()
        )

    def on_update(self):
        self.set_defaults()
        clear_system_settings_cache()

        if frappe.flags.update_last_reset_password_date:
            update_last_reset_password_date()

    def set_defaults(self):
        from frappe.translate import set_default_language

        for df in self.meta.get("fields"):
            if df.fieldtype not in no_value_fields and self.has_value_changed(df.fieldname):
                frappe.db.set_default(df.fieldname, self.get(df.fieldname))

        if self.language:
            set_default_language(self.language)

    def validate_snapshot_reports(self):
        old_doc = self.get_doc_before_save()
        if (old_doc.enable_snapshot_reports != self.enable_snapshot_reports) or (
            old_doc.frequency != self.frequency
        ):
            snapshot_report_scheduler(self.enable_snapshot_reports, self.frequency)


def update_last_reset_password_date():
    frappe.db.sql(
        """ UPDATE `tabUser`
        SET
            last_password_reset_date = %s
        WHERE
            last_password_reset_date is null""",
        today(),
    )


@frappe.whitelist()
def load():
    from frappe.utils.momentjs import get_all_timezones

    if "System Manager" not in frappe.get_roles():
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    defaults = {}

    for df in frappe.get_meta("System Settings").get("fields"):
        if df.fieldtype in ("Select", "Data"):
            defaults[df.fieldname] = get_system_settings(df.fieldname)

    return {"timezones": get_all_timezones(), "defaults": defaults}


def get_system_settings(key: str):
    """Return the value associated with the given `key` from System Settings DocType."""
    if not (system_settings := getattr(frappe.local, "system_settings", None)):
        try:
            system_settings = frappe.client_cache.get_doc("System Settings")
            frappe.local.system_settings = system_settings
        except frappe.DoesNotExistError:
            frappe.clear_last_message()
            return

    return system_settings.get(key)


def clear_system_settings_cache():
    frappe.client_cache.delete_value(frappe.get_document_cache_key("System Settings", "System Settings"))
    frappe.cache.delete_value("system_settings")
    frappe.cache.delete_value("time_zone")


def sync_system_settings():
    if frappe.db.get_single_value("System Settings", "currency") is None:
        frappe.db.set_single_value("System Settings", "currency", frappe.defaults.get_defaults()["currency"])


def disable_duckdb_cron_job():
    if event := frappe.db.get_all("Scheduler Event", {"scheduled_against": "DuckDB Sync"}, pluck="name"):
        event = event[0]
        frappe.db.delete("Scheduled Job Type", {"scheduler_event": event})
        frappe.db.delete("Scheduler Event", event)


def enable_duckdb_cron_job(frequency: str = "Daily"):
    cron_format = "0 0 * * *" if frequency == "Daily" else "0 * * * *"
    method = "frappe.database.duckdb.database.start_duckdb_sync"

    event = frappe.get_doc(
        {
            "doctype": "Scheduler Event",
            "scheduled_against": "DuckDB Sync",
            "method": method,
        }
    ).insert()
    frappe.get_doc(
        {
            "doctype": "Scheduled Job Type",
            "frequency": "Cron",
            "scheduler_event": event.name,
            "cron_format": cron_format,
            "method": method,
            "create_log": True,
        }
    ).insert()


def snapshot_report_scheduler(enable: bool = False, frequency: str = "Daily"):
    disable_duckdb_cron_job()
    if enable:
        enable_duckdb_cron_job(frequency)
