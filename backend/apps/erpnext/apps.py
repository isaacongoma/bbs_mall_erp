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
