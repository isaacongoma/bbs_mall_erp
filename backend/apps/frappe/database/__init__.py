from contextlib import contextmanager

from django.db import transaction


@contextmanager
def savepoint(catch: type[Exception] | tuple[type[Exception], ...] = Exception):
    try:
        with transaction.atomic():
            yield
    except catch:
        pass
