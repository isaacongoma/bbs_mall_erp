import hashlib
import importlib

from django.db import transaction

import frappe

_pending_job_ids = set()


def get_attr_for_job(method):
    if callable(method):
        return method
    module_path, _, attr = method.rpartition(".")
    try:
        module = importlib.import_module(module_path)
    except ModuleNotFoundError:
        if not module_path.startswith(("frappe.", "erpnext.")):
            raise
        module = importlib.import_module("apps." + module_path)
    return getattr(module, attr)


def execute_job(method, kwargs=None, user="Administrator", doc=None, job_id=None):
    previous_user = frappe.session.user
    frappe.session.user = user
    try:
        fn = get_attr_for_job(method)
        if doc is not None:
            return getattr(frappe.get_doc(doc[0], doc[1]), method)(**(kwargs or {}))
        return fn(**(kwargs or {}))
    finally:
        frappe.session.user = previous_user
        _pending_job_ids.discard(job_id)


def method_path(method):
    if isinstance(method, str):
        return method
    return f"{method.__module__}.{method.__qualname__}"


def create_job_id(job_id: str | list[str] | None = None) -> str:
    if not job_id:
        job_id = frappe.generate_hash()
    elif isinstance(job_id, list):
        job_id = "|".join(str(part) for part in job_id)
    return f"bbs_erp::{job_id}"


def is_job_enqueued(job_id: str) -> bool:
    return create_job_id(job_id) in _pending_job_ids or job_id in _pending_job_ids


def enqueue(
    method,
    queue="default",
    timeout=None,
    event=None,
    is_async=True,
    job_name=None,
    now=False,
    enqueue_after_commit=False,
    *,
    at_front=False,
    job_id=None,
    deduplicate=False,
    **kwargs,
):
    kwargs.pop("on_success", None)
    kwargs.pop("on_failure", None)
    kwargs.pop("at_front", None)
    user = frappe.session.user
    resolved_id = create_job_id(job_id) if job_id else None
    if deduplicate and resolved_id and resolved_id in _pending_job_ids:
        return None
    path = method_path(method)

    def run():
        return execute_job(method, kwargs, user=user, job_id=resolved_id)

    if now or frappe.in_test or not is_async:
        return run()

    if resolved_id:
        _pending_job_ids.add(resolved_id)

    def dispatch():
        from apps.frappe.tasks import run_job

        run_job.apply_async(args=[path, kwargs, user], queue=queue)

    if enqueue_after_commit:
        transaction.on_commit(dispatch)
    else:
        dispatch()
    return None


def enqueue_doc(doctype, name, method, queue="default", timeout=300, now=False, **kwargs):
    return enqueue(
        "apps.frappe.utils.background_jobs.run_doc_method",
        queue=queue,
        timeout=timeout,
        now=now,
        doctype=doctype,
        name=name,
        doc_method=method,
        **kwargs,
    )


def run_doc_method(doctype, name, doc_method, **kwargs):
    return getattr(frappe.get_doc(doctype, name), doc_method)(**kwargs)


def get_queue(qtype, is_async=True):
    return qtype


def get_jobs(site=None, queue=None, key="method"):
    return {}


def get_job(job_id):
    return None


def get_job_status(job_id):
    return None


def generate_qname(qtype: str) -> str:
    return qtype
