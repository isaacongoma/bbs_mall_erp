import frappe
from django.core.management.base import BaseCommand

from apps.frappe.modules.sync_artifacts import sync_app_artifacts


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true")

    def handle(self, *args, **options):
        previous = frappe.session.user
        frappe.session.user = "Administrator"
        try:
            from apps.bbs_property import setup

            if not frappe.db.exists("Module Def", "Property Management"):
                frappe.get_doc({"doctype": "Module Def", "module_name": "Property Management", "app_name": "bbs_property", "name": "Property Management"}).insert(ignore_permissions=True)
            setup.after_install()
            imported, failed = sync_app_artifacts("bbs_property", force=options["force"])
            self.stdout.write(f"artifacts imported: {imported}")
            for path, reason in failed:
                self.stderr.write(f"FAILED {path}: {reason}")
        finally:
            frappe.session.user = previous
