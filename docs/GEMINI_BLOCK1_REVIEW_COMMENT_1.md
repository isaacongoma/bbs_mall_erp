Review round 1 of your Block 1 work.

## Verified good
`manage.py test` runs 59 tests OK, `manage.py check` and `makemigrations --check` are clean. Real-JWT tests exist (valid, invalid token, two users in sequence). The `with_frappe_session` wrapper sets and restores `session.user`. `insert()` now runs `before_insert`, naming, `before_validate`, `validate`, `before_save`, `_validate`, which matches Frappe. Naming and NestedSet are much larger and have tests.

## Defects found in what you marked Fixed
1. **`check_if_latest` can never raise.** `TimestampMismatchError` is raised inside a `try` that ends in `except Exception: pass`, so the conflict check is dead code. Frappe compares the loaded `modified` for equality and raises `TimestampMismatchError`. Remove the blanket except and add a test that saving a stale copy fails.
2. **`submit()` never runs `before_submit`.** It sets `docstatus = 1`, calls `save()`, then `on_submit`. Port Frappe's `_submit` / `run_before_save_methods` mapping (`before_submit` for docstatus 1, `before_cancel` for 2, `on_update_after_submit`) and `run_post_save_methods` (`on_submit`, `on_cancel`, then `on_change`). `on_change` must also fire after `on_submit`.
3. **`cancel()` bypasses the pipeline.** It writes with `db_update()` directly, so `validate_update_after_submit`, `before_validate` and children docstatus are skipped. Frappe cancels through `save()` with `docstatus = 2`.
4. **Stubs reported as done:** `validate_higher_perm_levels` is `pass`, and `check_linked_documents_before_cancel` is `pass`, yet both are called as if working. Port `check_if_links_exist` / `check_no_back_links_exist` from `frappe/model/delete_doc.py` and the permlevel validation. A stub that silently does nothing is worse than a missing method.
5. **Swallowed exceptions remain:** `get_doc_before_save` uses `except Exception: return None`; it must only return None on `DoesNotExistError`. A broken meta must fail loudly.
6. **`copy_doc` returns a bare `Document(data)`** instead of the doctype's controller class, and it drops child rows' `name`/`parent` handling and `amended_from` unconditionally. Port `copy_doc` from `frappe/model/utils` and `Document.copy_doc` faithfully.
7. Stray trailing whitespace lines in `document.py`; clean them.

## Report and fixtures
- `ERP_PORT_BLOCK1_REPORT.md` still contains one literal `` `r`n `` artifact. Remove it.
- `apps/frappe/tests/oracle/` does not exist. The brief asked for oracle-derived fixtures committed as files (JSON generated with `spike/`), consumed by the tests. Create them for rounding, naming series, nested set left/right values and one Sales Invoice-independent document lifecycle trace.
- `test_nestedset.py` does not contain the 200 random-operation consistency test (insert/move/delete, then lft/rgt invariants and parity with a recomputed tree). Add it.
- State in the report exactly which numbers are oracle-verified and which come from upstream test files.

## Still open (unchanged, do not skip)
Defects 1 (14 pilot controllers still stubs), 2 (`frappe.utils` full port plus upstream tests), 4 (child-table semantics), 6 (exception messages), 9 (REST contract), 11 (Frappe core doctypes), and the permission leftovers (DocShare write/share, query-condition parity, `get_permitted_fields` consistency).

## Order
1. Fix items 1 to 6 above with tests (fast, they affect everything).
2. Oracle fixtures plus the 200-operation nested-set test.
3. Pilot controllers one by one, whole file plus upstream test: Item Group, Cost Center, Currency, UOM, Holiday List first.
4. Utilities, REST contract, core doctypes.
No Block 2. No commits. Report per defect number with exact commands and output.
