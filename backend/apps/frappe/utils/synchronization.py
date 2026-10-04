import os
from contextlib import contextmanager

from filelock import FileLock
from filelock import Timeout as LockTimeoutError

from apps.frappe.utils import get_bench_path


@contextmanager
def filelock(lock_name, *, timeout=30, is_global=False):
    lock_dir = os.path.join(get_bench_path(), "locks")
    os.makedirs(lock_dir, exist_ok=True)
    lock = FileLock(os.path.join(lock_dir, f"{lock_name}.lock"), timeout=timeout)
    with lock:
        yield
