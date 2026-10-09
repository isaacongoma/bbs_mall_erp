import time

from rq import exceptions as rq_exc
from rq.job import Job

import frappe
from frappe.core.doctype.rq_job.rq_job import RQJob, remove_failed_jobs, stop_job
from frappe.installer import update_site_config
from frappe.tests import IntegrationTestCase, timeout
from frappe.tests.utils.test_capabilities import TestService, requires_test_service
from frappe.utils import cstr, execute_in_shell
from frappe.utils.background_jobs import get_job_status, is_job_enqueued


@timeout(seconds=60)
def wait_for_completion(job: Job):
    while True:
        if not (job.is_queued or job.is_started):
            break
        time.sleep(0.2)


class TestRQJob(IntegrationTestCase):
    BG_JOB = "frappe.core.doctype.rq_job.test_rq_job.test_func"

    def setUp(self) -> None:
        for job in frappe.get_all("RQ Job", {"status": "queued"}):
            frappe.get_doc("RQ Job", job.name).cancel()
        return super().setUp()

    def check_status(self, job: Job, status, wait=True):
        if wait:
            wait_for_completion(job)
        self.assertEqual(frappe.get_doc("RQ Job", job.id).status, status)

    @requires_test_service(TestService.BACKGROUND_WORKER)
    def test_serialization(self):
        job = frappe.enqueue(method=self.BG_JOB, queue="short")
        rq_job = frappe.get_doc("RQ Job", job.id)

        self.assertEqual(job, rq_job.job)
        self.assertDocumentEqual(
            {
                "name": job.id,
                "queue": "short",
                "job_name": self.BG_JOB,
                "exc_info": None,
            },
            rq_job,
        )
        self.check_status(job, "finished")

    def test_configurable_ttl(self):
        frappe.conf.rq_job_failure_ttl = 600
        job = frappe.enqueue(method=self.BG_JOB, queue="short")

        self.assertEqual(job.failure_ttl, 600)

    def test_func_obj_serialization(self):
        job = frappe.enqueue(method=test_func, queue="short")
        rq_job = frappe.get_doc("RQ Job", job.id)
        self.assertEqual(rq_job.job_name, "frappe.core.doctype.rq_job.test_rq_job.test_func")

    @requires_test_service(TestService.BACKGROUND_WORKER)
    @timeout
    def test_get_list_filtering(self):
        remove_failed_jobs()
        jobs = frappe.get_all("RQ Job", {"status": "failed"})
        self.assertEqual(jobs, [])

        job = frappe.enqueue(method=self.BG_JOB, queue="short")
        self.check_status(job, "finished")

        job = frappe.enqueue(method=self.BG_JOB, queue="short", fail=True)
        self.check_status(job, "failed")
        jobs = frappe.get_all("RQ Job", {"status": "failed"})
        self.assertEqual(len(jobs), 1)
        self.assertTrue(jobs[0].exc_info)

        non_failed_jobs = frappe.get_all("RQ Job", {"status": ("!=", "failed")})
        self.assertGreaterEqual(len(non_failed_jobs), 1)

        job = frappe.enqueue(method=self.BG_JOB, queue="short", sleep=10)
        time.sleep(3)
        self.check_status(job, "started", wait=False)
        stop_job(job_id=job.id)
        self.check_status(job, "stopped")

    def test_delete_doc(self):
        job = frappe.enqueue(method=self.BG_JOB, queue="short")
        frappe.get_doc("RQ Job", job.id).delete()

        with self.assertRaises(rq_exc.NoSuchJobError):
            job.refresh()

    def test_queue_filter_rejects_suffix_collision(self):
        """`queue = long` must not include a custom
        queue whose name is a suffix of `long` (e.g. `schedulelong`).

        The old check `queue.name.endswith(tuple(queues))` false-matched any
        suffix. Fix uses `rsplit(":", 1)[-1] not in queues` so only exact
        short-name matches pass.
        """
        from unittest.mock import MagicMock, patch

        site = frappe.local.site

        long_queue = MagicMock(name="long_queue")
        long_queue.name = "test-bench:long"
        collide_queue = MagicMock(name="collide_queue")
        collide_queue.name = "test-bench:schedulelong"

        def fake_fetch(queue, status):
            short = queue.name.rsplit(":", 1)[-1]
            return [f"{site}||{short}-{status}"]

        module = "frappe.core.doctype.rq_job.rq_job"
        with (
            patch(f"{module}.get_queues", return_value=[long_queue, collide_queue]),
            patch(f"{module}.get_custom_queues", return_value=["schedulelong"]),
            patch(f"{module}.fetch_job_ids", side_effect=fake_fetch),
        ):
            result = RQJob.get_matching_job_ids(filters=[["RQ Job", "queue", "=", "long"]])

        self.assertFalse(
            any("schedulelong" in job_id for job_id in result),
            f"queue=long filter must exclude schedulelong, got: {result!r}",
        )
        self.assertTrue(
            all("||long-" in job_id for job_id in result),
            f"every returned id should be from the long queue, got: {result!r}",
        )
        self.assertEqual(len(result), 7)

    @requires_test_service(TestService.BACKGROUND_WORKER)
    @timeout
    def test_multi_queue_burst_consumption(self):
        for _ in range(3):
            for q in ["default", "short"]:
                frappe.enqueue(self.BG_JOB, sleep=1, queue=q)

        _, stderr = execute_in_shell("bench worker --queue short,default --burst", check_exit_code=True)
        self.assertIn("quitting", cstr(stderr))

    @requires_test_service(TestService.BACKGROUND_WORKER)
    @timeout
    def test_multi_queue_burst_consumption_worker_pool(self):
        for _ in range(3):
            for q in ["default", "short"]:
                frappe.enqueue(self.BG_JOB, sleep=1, queue=q)

        _, stderr = execute_in_shell(
            "bench worker-pool --queue short,default --burst --num-workers=4",
            check_exit_code=True,
        )
        self.assertIn("quitting", cstr(stderr))

    @requires_test_service(TestService.BACKGROUND_WORKER)
    def test_job_id_manual_dedup(self):
        job_id = "test_dedup"
        job = frappe.enqueue(self.BG_JOB, sleep=5, job_id=job_id)
        self.assertTrue(is_job_enqueued(job_id))
        self.check_status(job, "finished")
        self.assertFalse(is_job_enqueued(job_id))

    @requires_test_service(TestService.BACKGROUND_WORKER)
    def test_auto_job_dedup(self):
        job_id = "test_dedup"
        job1 = frappe.enqueue(self.BG_JOB, sleep=2, job_id=job_id, deduplicate=True)
        job2 = frappe.enqueue(self.BG_JOB, sleep=5, job_id=job_id, deduplicate=True)
        self.assertIsNone(job2)
        self.check_status(job1, "finished")

        job3 = frappe.enqueue(self.BG_JOB, fail=True, job_id=job_id, deduplicate=True)
        self.check_status(job3, "failed")
        job4 = frappe.enqueue(self.BG_JOB, sleep=1, job_id=job_id, deduplicate=True)
        self.check_status(job4, "finished")

    @timeout
    def test_enqueue_after_commit(self):
        job_id = frappe.generate_hash()

        frappe.enqueue(self.BG_JOB, enqueue_after_commit=True, job_id=job_id)
        self.assertIsNone(get_job_status(job_id))

        frappe.db.commit()
        self.assertIsNotNone(get_job_status(job_id))

        job_id = frappe.generate_hash()
        frappe.enqueue(self.BG_JOB, enqueue_after_commit=True, job_id=job_id)
        self.assertIsNone(get_job_status(job_id))

        frappe.db.rollback()
        self.assertIsNone(get_job_status(job_id))

        frappe.db.commit()
        self.assertIsNone(get_job_status(job_id))

    @requires_test_service(TestService.BACKGROUND_WORKER)
    def test_memory_usage(self):
        if frappe.db.db_type != "mariadb":
            return
        job = frappe.enqueue("frappe.utils.data._get_rss_memory_usage")
        self.check_status(job, "finished")

        rss = job.latest_result().return_value
        msg = """Memory usage of simple background job increased. Potential root cause can be a newly added python module import. Check and move them to approriate file/function to avoid loading the module by default."""

        LAST_MEASURED_USAGE = 46
        if frappe.conf.use_mysqlclient:
            LAST_MEASURED_USAGE += 2

        LAST_MEASURED_USAGE += 6

        LAST_MEASURED_USAGE += 1

        LAST_MEASURED_USAGE += 3

        self.assertLessEqual(rss, LAST_MEASURED_USAGE * 1.05, msg)

    @requires_test_service(TestService.BACKGROUND_WORKER)
    def test_clear_failed_jobs(self):
        limit = 10
        update_site_config("rq_failed_jobs_limit", limit)

        jobs = [frappe.enqueue(method=self.BG_JOB, queue="short", fail=True) for _ in range(limit * 2)]
        self.check_status(jobs[-1], "failed")
        self.assertLessEqual(
            RQJob.get_count(filters=[["RQ Job", "status", "=", "failed"], ["RQ Job", "queue", "=", "short"]]),
            limit * 1.2,
        )

    @requires_test_service(TestService.BACKGROUND_WORKER)
    def test_pickle_lazy_doc_for_rq_job(self):
        job = frappe.enqueue(test_serialization, user=frappe.get_lazy_doc("User", "Guest"))
        self.check_status(job, "finished")


def test_serialization(user):
    assert user.roles
    return True


def test_func(fail=False, sleep=0):
    if fail:
        42 / 0
    if sleep:
        time.sleep(sleep)

    return True
