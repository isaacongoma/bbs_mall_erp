Review round 2 of Block 1. Block 1 is still open. Keep going, but change the order of work and fix the deviations below. Report against the numbered defect list from review round 1 (items 1 to 11), item by item, with status fixed / partly / not started.

## What improved (verified: `manage.py test apps.erpnext.tests.test_foundation apps.erpnext.tests.test_fiscal_year` ran 10 tests OK in an isolated test database)
- Real isolated tests now run; the status ledger is corrected and honest.
- `apps/frappe/exceptions.py` exists with HTTP codes; child-table persistence (`db_save_children`) was added to `Document`.
- `Fiscal Year` controller is ported (validate_dates, validate_overlap, on_update/on_trash, auto_create_fiscal_year, get_from_and_to_date) with 5 tests.

## Problems in what was ported (fix these)
1. **Savepoint behaviour was changed to make the port run.** Upstream `auto_create_fiscal_year` does `frappe.db.rollback(save_point="auto_create_fiscal_year")`. The port calls `frappe.db.rollback()`, and the runtime `rollback()` takes no savepoint and rolls back the whole transaction. That is exactly the failure upstream's comment warns about (one duplicate year poisons the scheduler transaction). Implement `frappe.db.rollback(save_point=...)` as `ROLLBACK TO SAVEPOINT`, `release_savepoint`, and restore the call exactly as upstream. Add a test with two candidate years where the first collides.
2. **Exception hierarchy is wrong.** `frappe.NameError = DuplicateEntryError` is an alias. In Frappe `NameError` is its own class and `DuplicateEntryError` subclasses it. Port `vendor/frappe/frappe/exceptions.py` in full (all classes, `http_status_code`, `ValidationError` subclasses, `InvalidDates`, `DoesNotExistError`, `PermissionError`, `QueryTimeoutError`, ...). Also remove the `except Exception -> 400` blanket in `views.py` and map by class.
3. **`frappe.get_desk_link` returns plain text** (`"Fiscal Year X"`). Frappe returns an anchor with the desk route; error messages must be identical. Port it (keep the route format configurable for the React app).
4. **Query rewritten with the Django ORM instead of the upstream query builder.** Allowed only if results are identical, but you must say so in the ledger and keep the method signatures. Preferable: provide `frappe.qb` compatibility (pypika-style `DocType`, `from_`, `select`, `where`, `run(as_dict=True)`) because ERPNext uses it in hundreds of places; ported code should call it unchanged. Decide now, document it in the status file, and apply it consistently.
5. **Test coverage vs upstream:** port every case from `vendor/erpnext/erpnext/accounts/doctype/fiscal_year/test_fiscal_year.py`, not a subset, with the same names.
6. `manage.py test` (no arguments) still discovers 0 tests. Fix discovery (`tests/__init__.py`, naming) so the plain command runs the whole suite. Delete `verify_erpnext_foundation` once the isolated tests cover the same ground; it writes to the dev database.

## Still not addressed from round 1 (do these next, in this order, because everything else depends on them)
A. **`frappe.utils.data` (defect 2).** `flt(2.675, 2)` still returns `2.67` and `flt(1.005, 2)` returns `1.0`; the file is still 83 lines. This blocks all ledger parity. Port the full upstream module and the upstream tests first, before any more doctypes.
B. **Permissions security hole (defect 3).** `has_permission` still ends with `return ptype == "read"` (everyone can read everything), still swallows exceptions, still unused by the API. This is a security defect, fix it before continuing. Default-deny, real role matrix, user permissions, `if_owner`, wired into every endpoint, plus tests (a user without the role gets 403 on list/detail/create).
C. **Document engine port (defect 5).** Insert order (`before_insert`, naming, `before_validate`, `validate`, `before_save`), conflict check, docstatus rules, `update_after_submit`, `amended_from`, `set_only_once`, `non_negative`, defaults, `fetch_from`, precision rounding, `db_set`, `get_doc_before_save`, `has_value_changed`, `copy_doc`, `doc_events` dispatch. Port `vendor/frappe/frappe/model/document.py` and `base_document.py` method by method; the current file is 304 lines against about 4,500 upstream.
D. **Naming (defect 7)** and **NestedSet (defect 8):** `naming.py` (42 lines) and `nestedset.py` (48 lines) are unchanged.
E. **Remaining 14 pilot controllers (defect 1):** Currency, UOM, Item Group (the upstream NestedSet-based controller), Cost Center, Branch, Department, Designation, Terms and Conditions, Holiday List, Territory, Customer Group, Supplier Group, Sales Person. Each is still a 5-line stub. Port the whole `.py` file for each, plus its upstream test file.
F. **REST API (defect 9)** and **Frappe core doctypes (defect 11)**.

## How to report next time
- Per defect number: fixed / partly / not started, with the exact test command and output.
- A doctype counts as "controller ported" only when every method in the vendor `.py` is ported or listed as intentionally skipped with a reason.
- No deviations from the vendor code to make something run; if the framework lacks a function, implement the function in `apps/frappe` rather than editing the ported controller.
- Do not start Block 2 until A to F are finished and I have reviewed them.
