import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("bbs_erp")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# autodiscover_tasks() only looks for a tasks.py at the root of each INSTALLED_APPS entry
# (apps/core/tasks.py, apps/crm/tasks.py); it doesn't fall into nested feature packages like
# apps/core/automation_engine/tasks.py or apps/crm/domain_enrichment/tasks.py, so neither would
# ever actually register with a worker without an explicit import.
app.autodiscover_tasks(["apps.core.automation_engine", "apps.crm.domain_enrichment"], related_name="tasks")
