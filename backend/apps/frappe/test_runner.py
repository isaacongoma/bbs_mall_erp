from django.test.runner import DiscoverRunner


class FrappeTestRunner(DiscoverRunner):
    def setup_databases(self, **kwargs):
        configuration = super().setup_databases(**kwargs)
        if configuration:
            from apps.erpnext.tests.utils import ensure_bootstrapped

            ensure_bootstrapped()
        return configuration
