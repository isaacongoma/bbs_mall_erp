from django.apps import AppConfig
from django.db.models.signals import post_migrate


def install_fixtures_after_migrate(sender, **kwargs):
    from apps.erpnext.doctype_sync import sync_doctype_tables
    from apps.erpnext.install import install_base_fixtures

    sync_doctype_tables()
    install_base_fixtures()


class ErpnextConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.erpnext"
    label = "erpnext"

    def ready(self):
        post_migrate.connect(install_fixtures_after_migrate, sender=self)
        self._load_runtime_doctypes()

    @staticmethod
    def _load_runtime_doctypes():
        import sys

        if any(command in sys.argv for command in ("makemigrations", "migrate", "test")):
            return
        from django.db.utils import DatabaseError

        from apps.frappe.model.dynamic_doctype import load_all

        import threading

        def run():
            from django.db import connection

            try:
                load_all()
            except DatabaseError:
                pass
            finally:
                connection.close()

        worker = threading.Thread(target=run)
        worker.start()
        worker.join()
