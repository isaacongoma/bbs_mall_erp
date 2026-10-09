import frappe
from frappe.sessions import hash_sid
from frappe.utils import is_sha256_hash


def execute():
    """Convert stored session ids to their sha256 hash.

    Sessions used to be stored under the same raw sid the client holds in its
    cookie. Lookups now hash the incoming cookie before matching, so the stored
    values have to be hashed in place to keep existing logins working.
    """
    Sessions = frappe.qb.DocType("Sessions")
    rows = (frappe.qb.from_(Sessions).select(Sessions.sid)).run(pluck=True)

    frappe.db.auto_commit_on_many_writes = True
    try:
        for sid in rows:
            if not sid or is_sha256_hash(sid):
                continue

            (frappe.qb.update(Sessions).where(Sessions.sid == sid).set(Sessions.sid, hash_sid(sid))).run()
    finally:
        frappe.db.auto_commit_on_many_writes = False

    frappe.cache.delete_key("session")
