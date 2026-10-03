# A Lead/Deal's business logic appends rolling-response and status-change rows
# to itself before the parent row necessarily exists yet (e.g. during a create,
# inside before_save-equivalent code). Django's reverse-FK managers need the
# parent's PK already committed, so new rows are buffered here and flushed
# once the parent has actually been saved. Rows that mutate an existing
# (already-persisted) child row don't go through this -- only newly appended ones.
class ChildRowBufferMixin:
    def buffer_child_row(self, related_name, **fields):
        pending = getattr(self, "_pending_child_rows", None)
        if pending is None:
            pending = {}
            self._pending_child_rows = pending
        pending.setdefault(related_name, []).append(fields)

    def flush_child_rows(self):
        pending = getattr(self, "_pending_child_rows", {})
        for related_name, rows in pending.items():
            manager = getattr(self, related_name)
            next_idx = manager.count() + 1
            for i, row in enumerate(rows):
                manager.create(idx=next_idx + i, **row)
        self._pending_child_rows = {}
