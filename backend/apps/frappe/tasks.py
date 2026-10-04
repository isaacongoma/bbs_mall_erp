from celery import shared_task


@shared_task(name="frappe.run_job")
def run_job(method, kwargs=None, user="Administrator", doc=None):
    from apps.frappe.utils.background_jobs import execute_job

    return execute_job(method, kwargs or {}, user=user, doc=doc)
