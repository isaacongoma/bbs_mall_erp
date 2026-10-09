import os
import random
import signal
import socket
from threading import Thread
from typing import Any, NoReturn
from uuid import uuid4
from rq import Callback, Queue, Worker
from rq.defaults import DEFAULT_WORKER_TTL
from rq.job import Job, JobStatus
from rq.logutils import setup_loghandlers
from rq.timeouts import JobTimeoutException
from rq.worker import DequeueStrategy, StopRequested, WorkerStatus
from rq.worker_pool import WorkerPool
from frappe import _
from frappe.utils import CallbackManager, cint, get_bench_id, get_sites
from frappe.utils.caching import site_cache
from frappe.utils.data import sbool
from frappe.utils.redis_queue import RedisQueue
from functools import lru_cache
from collections.abc import Callable
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

    job = EnqueuedJob((resolved_id or create_job_id(None)).removeprefix("bbs_erp::"), path, queue)

    def run():
        job.status = "started"
        try:
            job.result = execute_job(method, kwargs, user=user, job_id=resolved_id)
        except Exception:
            job.status = "failed"
            raise
        job.status = "finished"
        return job.result

    if now or frappe.in_test or not is_async:
        run()
        return job

    if resolved_id:
        _pending_job_ids.add(resolved_id)

    def dispatch():
        from apps.frappe.tasks import run_job

        run_job.apply_async(args=[path, kwargs, user], queue=queue)

    if enqueue_after_commit:
        transaction.on_commit(dispatch)
    else:
        dispatch()
    return job


class EnqueuedJob:
    def __init__(self, job_id, method, queue):
        self.id = job_id
        self.method = method
        self.queue = queue
        self.status = "queued"
        self.result = None
        _job_log[job_id] = self

    def get_id(self):
        return self.id


_job_log = {}


def job_rows():
    return [
        {
            "doctype": "RQ Job",
            "name": job.id,
            "job_id": job.id,
            "queue": job.queue,
            "status": job.status,
            "job_name": job.method,
        }
        for job in _job_log.values()
    ]


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


class _Queue:
    def __init__(self, name):
        self.name = name

    @property
    def jobs(self):
        return []

    def __len__(self):
        return 0


def get_queue(qtype, is_async=True):
    return _Queue(qtype)


def get_running_jobs_in_queue(queue):
    return []


def get_jobs(site=None, queue=None, key="method"):
    return {}


def get_job(job_id):
    return None


def get_job_status(job_id):
    return None


def generate_qname(qtype: str) -> str:
    return qtype


def mapreduce(
    map_method: str | Callable,
    reduce_method: str | Callable,
    callback_method: str | Callable,
    data: str,
    document_type: str,
    document_name: str,
    job_name: str,
):
    doc = frappe.new_doc("MapReduce Job")
    doc.map = map_method
    doc.reduce = reduce_method
    doc.callback = callback_method
    doc.data = frappe.json.dumps(data)
    doc.document_type = document_type
    doc.document_name = document_name
    doc.job_name = job_name
    doc.insert().submit()
    return doc


def cancel_mapreduce_job(document_type: str, document_name: str):
    jobs = frappe.db.get_all(
        "MapReduce Job", {"document_type": document_type, "document_name": document_name, "docstatus": 1}
    )
    for j in jobs:
        frappe.get_doc("MapReduce Job", j.name).cancel()

    if jobs:
        if tasks := frappe.db.get_all(
            "Background Task",
            filters={
                "status": ["in", ["Queued", "Running"]],
                "ref_doctype": "MapReduce Job",
                "ref_docname": ["in", [j.name for j in jobs]],
            },
            fields="task_id",
            pluck="task_id",
        ):
            from frappe.core.doctype.background_task.background_task import stop_task

            for t in tasks:
                stop_task(task_id=t)


def remove_mapreduce_job(document_type: str, document_name: str):
    jobs = frappe.db.get_all(
        "MapReduce Job", {"document_type": document_type, "document_name": document_name}
    )
    for j in jobs:
        doc = frappe.get_doc("MapReduce Job", j.name)
        if doc.docstatus != 2:
            doc.cancel()
        frappe.delete_doc("MapReduce Job", j.name, force=True, ignore_permissions=True)


_redis_queue_conn = None


def get_redis_conn(username=None, password=None):
    global _redis_queue_conn
    if _redis_queue_conn is None:
        import redis
        from django.conf import settings

        _redis_queue_conn = redis.Redis.from_url(settings.CELERY_BROKER_URL)
    return _redis_queue_conn


@lru_cache
def get_queues_timeout() -> dict[str, int]:
    """
    Method returning a mapping of queue name to timeout for that queue

    :return: Dictionary of queue name to timeout
    """
    common_site_config = frappe.get_conf()
    custom_workers_config = common_site_config.get("workers") or {}
    default_timeout = 300

    if not isinstance(custom_workers_config, dict):
        custom_workers_config = {}

    timeouts = {
        "short": default_timeout,
        "default": default_timeout,
        "long": 1500,
        **{
            worker: config.get("timeout", default_timeout)
            for worker, config in custom_workers_config.items()
            if isinstance(config, dict)
        },
    }
    assert {"short", "default", "long"} <= timeouts.keys(), "built-in queues must always exist"
    return timeouts


def validate_queue(queue: str, default_queue_list: list | None = None) -> None:
    if not default_queue_list:
        default_queue_list = list(get_queues_timeout())

    if queue not in default_queue_list:
        frappe.throw(frappe._("Queue should be one of {0}").format(", ".join(default_queue_list)))


def get_queue_list(queue_list=None, build_queue_name=False):
    default_queue_list = list(get_queues_timeout())
    if queue_list:
        if isinstance(queue_list, str):
            queue_list = [queue_list]

        for queue in queue_list:
            validate_queue(queue, default_queue_list)
    else:
        queue_list = default_queue_list
    return [generate_qname(qtype) for qtype in queue_list] if build_queue_name else queue_list


def get_workers(queue=None):
    from rq import Worker

    if queue:
        return Worker.all(queue=queue)
    return Worker.all(get_redis_conn())


def get_queues(connection=None):
    from rq import Queue

    return Queue.all(connection=connection or get_redis_conn())


BACKGROUND_PROCESS_NICENESS = 10


def set_niceness():
    import os

    conf = frappe.get_conf()
    nice_increment = BACKGROUND_PROCESS_NICENESS

    configured_niceness = conf.get("background_process_niceness")

    if configured_niceness is not None:
        nice_increment = frappe.utils.cint(configured_niceness)

    if hasattr(os, "nice"):
        os.nice(nice_increment)


class _DeferredEnqueueAfterCommit:
    """Keep after-commit jobs pending across intermediate commits."""

    def __init__(self):
        self.callbacks = CallbackManager()
        self.parent_callbacks = None
        self.cancelled = False

    def __enter__(self):
        self.parent_callbacks = getattr(frappe.local, "deferred_enqueue_after_commit", None)
        frappe.local.deferred_enqueue_after_commit = self.callbacks
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        try:
            if exc_type is None and not self.cancelled:
                self._release_after_transaction_commit()
        finally:
            if self.parent_callbacks is None:
                del frappe.local.deferred_enqueue_after_commit
            else:
                frappe.local.deferred_enqueue_after_commit = self.parent_callbacks
            self.callbacks.reset()

    def cancel(self):
        """Discard held jobs when a workflow handles an error without raising it."""
        self.cancelled = True

    def _release_after_transaction_commit(self):
        """Move held jobs to the enclosing deferral or the database commit callbacks."""
        target = self.parent_callbacks or frappe.db.after_commit
        for callback in self.callbacks.cut(0):
            target.add(callback)


def defer_enqueue_after_commit():
    """Hold after-commit jobs across intermediate commits in a larger workflow.

    A clean context exit moves held jobs to the real transaction callbacks. An
    exception discards them. Call ``cancel`` only when an error is handled inside
    the context and therefore does not escape it.
    """
    return _DeferredEnqueueAfterCommit()


def start_worker(
    queue: str | None = None,
    quiet: bool = False,
    rq_username: str | None = None,
    rq_password: str | None = None,
    burst: bool = False,
    strategy: DequeueStrategy | None = DequeueStrategy.DEFAULT,
) -> NoReturn:
    """Wrapper to start rq worker. Connects to redis and monitors these queues."""

    if not strategy:
        strategy = DequeueStrategy.DEFAULT

    _start_sentry()

    redis_connection = get_redis_conn(username=rq_username, password=rq_password)

    if queue:
        queue = [q.strip() for q in queue.split(",")]
    queues = get_queue_list(queue, build_queue_name=True)

    if os.environ.get("CI"):
        setup_loghandlers("ERROR")

    set_niceness()

    logging_level = "INFO"
    if quiet:
        logging_level = "WARNING"

    worker = Worker(queues, connection=redis_connection)
    worker.work(
        logging_level=logging_level,
        burst=burst,
        date_format="%Y-%m-%d %H:%M:%S",
        log_format="%(asctime)s,%(msecs)03d %(message)s",
        dequeue_strategy=strategy,
        with_scheduler=False,
    )


class FrappeWorker(Worker):
    def work(self, *args, **kwargs):
        self.start_frappe_scheduler()
        kwargs["with_scheduler"] = False
        return super().work(*args, **kwargs)

    def run_maintenance_tasks(self, *args, **kwargs):
        """Attempt to start a scheduler in case the worker doing scheduling died."""
        self.start_frappe_scheduler()
        return super().run_maintenance_tasks(*args, **kwargs)

    def start_frappe_scheduler(self):
        from frappe.utils.scheduler import start_scheduler

        Thread(target=start_scheduler, daemon=True).start()


class FrappeWorkerNoFork(FrappeWorker):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.push_exc_handler(self.no_fork_exception_handler)

    def work(self, *args, **kwargs):
        kwargs["max_jobs"] = RQ_MAX_JOBS + random.randint(0, RQ_MAX_JOBS_JITTER)
        return super().work(*args, **kwargs)

    def execute_job(self, job: "Job", queue: "Queue"):
        """Execute job in same thread/process, do not fork()"""
        self.prepare_execution(job)
        self.perform_job(job, queue)
        self.set_state(WorkerStatus.IDLE)

    def no_fork_exception_handler(self, job, exc_type, exc_value, traceback):
        if isinstance(exc_value, JobTimeoutException):
            raise StopRequested

    def get_heartbeat_ttl(self, job: "Job") -> int:
        if job.timeout == -1:
            return DEFAULT_WORKER_TTL
        else:
            return int(job.timeout or DEFAULT_WORKER_TTL) + 60

    def kill_horse(self, sig=getattr(signal, "SIGKILL", signal.SIGTERM)):
        os.kill(os.getpid(), sig)


def start_worker_pool(
    queue: str | None = None,
    num_workers: int = 1,
    quiet: bool = False,
    burst: bool = False,
) -> NoReturn:
    """Start worker pool with specified number of workers.

    WARNING: This feature is considered "EXPERIMENTAL".
    """
    _start_sentry()

    import filelock

    import frappe.database.query
    import frappe.query_builder
    import frappe.utils
    import frappe.utils.safe_exec
    import frappe.utils.scheduler
    import frappe.utils.typing_validations
    import frappe.website.path_resolver

    redis_connection = get_redis_conn()

    if queue:
        queue = [q.strip() for q in queue.split(",")]
    queues = get_queue_list(queue, build_queue_name=True)

    if os.environ.get("CI"):
        setup_loghandlers("ERROR")

    set_niceness()
    logging_level = "INFO"
    if quiet:
        logging_level = "WARNING"

    if sbool(os.environ.get("FRAPPE_BACKGROUND_WORKERS_NOFORK", False)):
        worker_klass = FrappeWorkerNoFork
    else:
        import multiprocessing

        multiprocessing.set_start_method("fork", force=True)
        worker_klass = FrappeWorker

    pool = WorkerPool(
        queues=queues,
        connection=redis_connection,
        num_workers=num_workers,
        worker_class=worker_klass,
    )
    pool.start(logging_level=logging_level, burst=burst)


def get_worker_name(queue):
    """When limiting worker to a specific queue, also append queue name to default worker name"""
    name = None

    if queue:
        name = f"{uuid4().hex}.{socket.gethostname()}.{os.getpid()}.{queue}"

    return name


def get_redis_connection_without_auth():
    global _redis_queue_conn

    if not _redis_queue_conn:
        _redis_queue_conn = RedisQueue.get_connection()
    return _redis_queue_conn


def is_queue_accessible(qobj: Queue) -> bool:
    """Checks whether queue is relate to current bench or not."""
    accessible_queues = [generate_qname(q) for q in list(get_queues_timeout())]
    return qobj.name in accessible_queues


def enqueue_test_job():
    enqueue("frappe.utils.background_jobs.test_job", s=100)


def test_job(s):
    import time

    print("sleeping...")
    time.sleep(s)


def truncate_failed_registry(job, connection, type, value, traceback):
    """Ensures that number of failed jobs don't exceed specified limits."""
    from frappe.utils import create_batch

    conf = frappe.conf if frappe.conf else frappe.get_conf(site=job.kwargs.get("site"))
    limit = (conf.get("rq_failed_jobs_limit") or RQ_FAILED_JOBS_LIMIT) - 1

    for queue in get_queues(connection=connection):
        fail_registry = queue.failed_job_registry
        failed_jobs = fail_registry.get_job_ids()[limit:]
        for job_ids in create_batch(failed_jobs, 100):
            for job_obj in Job.fetch_many(job_ids=job_ids, connection=connection):
                job_obj and fail_registry.remove(job_obj, delete_job=True)


def _check_queue_size(q: Queue):
    max_jobs = cint(frappe.conf.max_queued_jobs) or MAX_QUEUED_JOBS
    max_jobs += _site_count() * 50

    if cint(q.count) >= max_jobs:
        primary_action = {
            "label": "Monitor System Health",
            "client_action": "frappe.set_route",
            "args": ["Form", "System Health Report"],
        }
        frappe.throw(
            _("Too many queued background jobs ({0}). Please retry after some time.").format(max_jobs),
            title=_("Queue Overloaded"),
            exc=frappe.QueueOverloaded,
            primary_action=primary_action if frappe.has_permission("System Health Report") else None,
        )


@site_cache(ttl=10 * 60)
def _site_count() -> int:
    return len(get_sites())


def _start_sentry():
    sentry_dsn = os.getenv("FRAPPE_SENTRY_DSN")
    if not sentry_dsn:
        return

    import sentry_sdk
    from sentry_sdk.integrations.argv import ArgvIntegration
    from sentry_sdk.integrations.atexit import AtexitIntegration
    from sentry_sdk.integrations.dedupe import DedupeIntegration
    from sentry_sdk.integrations.excepthook import ExcepthookIntegration
    from sentry_sdk.integrations.modules import ModulesIntegration

    from frappe.utils.sentry import FrappeIntegration, before_send

    integrations = [
        AtexitIntegration(),
        ExcepthookIntegration(),
        DedupeIntegration(),
        ModulesIntegration(),
        ArgvIntegration(),
    ]

    kwargs = {}

    if os.getenv("ENABLE_SENTRY_DB_MONITORING"):
        integrations.append(FrappeIntegration())

    if tracing_sample_rate := os.getenv("SENTRY_TRACING_SAMPLE_RATE"):
        kwargs["traces_sample_rate"] = float(tracing_sample_rate)

    if profiling_sample_rate := os.getenv("SENTRY_PROFILING_SAMPLE_RATE"):
        kwargs["profiles_sample_rate"] = float(profiling_sample_rate)

    sentry_sdk.init(
        dsn=sentry_dsn,
        before_send=before_send,
        attach_stacktrace=True,
        release=frappe.__version__,
        auto_enabling_integrations=False,
        default_integrations=False,
        integrations=integrations,
        **kwargs,
    )


RQ_FAILED_JOBS_LIMIT = 1000
RQ_MAX_JOBS = 5000
RQ_MAX_JOBS_JITTER = 50
MAX_QUEUED_JOBS = 500


RQ_JOB_FAILURE_TTL = 7 * 24 * 60 * 60
RQ_FAILED_JOBS_LIMIT = 1000
RQ_RESULTS_TTL = 10 * 60
RQ_MAX_JOBS = 5000
RQ_MAX_JOBS_JITTER = 50
MAX_QUEUED_JOBS = 500
QUEUE_STARVATION_THRESHOLD = 16
