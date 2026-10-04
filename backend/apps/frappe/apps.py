from django.apps import AppConfig


class FrappeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.frappe"
    label = "frappe"

    def ready(self):
        from apps.frappe.testing import install_test_helpers

        install_test_helpers()



def get_apps():
    return []


def get_default_path(apps=None):
    return None


def is_desk_apps(apps=None):
    return False
