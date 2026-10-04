# Grok Block 1 continuation report

Command: `cd backend; .venv\Scripts\python.exe manage.py test --verbosity 1`

Tail:

```
Found 129 test(s).
Ran 129 tests in 28.253s

OK
Destroying test database for alias 'default'...
```

Document-lifecycle subset, same command with `apps.frappe.tests.test_document`:

```
Found 7 test(s).
Ran 7 tests in 0.369s

OK
```

The first full run this session, before the suite fixes, was `Found 126 test(s)` and `FAILED (errors=22)`.

## Defects from GEMINI_BLOCK1_REVIEW_COMMENT_1.md

| # | Status | Evidence |
|---|---|---|
| 1 check_if_latest | fixed for the stale-copy case | `test_stale_document_save_fails` passed. A rejected save restores `modified` so the next save is not a false mismatch. |
| 2 before_submit / on_change order | fixed for Branch submit | `test_submit_cancel_pipeline` asserts `before_submit` before `on_submit` before `on_change`. |
| 3 cancel through save | fixed for the Branch failure path | `test_cancel_does_not_persist_when_before_cancel_fails` leaves docstatus 1. Successful cancel stores docstatus 2. |
| 4 permlevel and linked docs | partial | Permlevel reset is tested both ways. Static Link delete blocking is tested with Company and Cost Center. `delete_doc.py` and dynamic links are not ported. |
| 5 swallowed exceptions | fixed for get_doc_before_save | None only for a missing row (`DoesNotExistError` or Django `ObjectDoesNotExist`). Unknown doctype raises `LookupError`. Other `except Exception` sites remain in `db_insert`, `validate_mandatory`, and `set_fetch_from_values`. |
| 6 copy_doc | partial | Controller class, cleared name, docstatus, and `amended_from` are tested. Child row clearing is not tested. |
| 7 whitespace and report artifact | fixed | No trailing whitespace in `document.py`. The `` `r`n `` artifact in `ERP_PORT_BLOCK1_REPORT.md` is gone. |

Oracle fixtures under `backend/apps/frappe/tests/oracle/` and `test_200_random_operations` were already present. They passed in the 129-test run. I did not recompute them from `spike/` this session, so I am not claiming a fresh oracle comparison.

## Still open

- Item Group: partial controller. `validate_item_group_defaults` is `pass`. Tree tests pass. Upstream merge, preset-record, and patch tests need `rename_doc` and setup-wizard fixtures.
- Cost Center: child-node test passes. Whole upstream file was not re-audited.
- Currency: model and country_info seed exist. Controller is a stub. `money_in_words` tests pass.
- UOM, Holiday List, Branch, Department, Designation, Terms and Conditions, Territory, Customer Group, Supplier Group, Sales Person: not taken as completed Step 2 items. Customer Group's account-currency check was aligned with upstream so the suite could insert a group with no accounts.
- `frappe.utils` full port. Large parts of `test_utils.py` are empty `pass` classes. `get_defaults` returns `{}`.
- REST contract.
- Frappe core doctypes.
- Child-table semantics.
- Permission leftovers: DocShare write/share, query-condition parity, `get_permitted_fields`.
- `delete_doc.py` and `rename_doc.py`.
- No Block 2 work was started.

## Unsure

- Whether PostgreSQL would still round `modified` differently from the in-memory value if `_sync_modified_from_db` were removed. With the sync and the failed-save restore, the submit test passes. I did not prove the round-trip is exact without the sync.
- `change_settings` writes `local.system_settings` instead of saving a System Settings document. That matches the current `get_system_settings` and the rounding tests. It is not the upstream save/restore of the settings doc.
- Currency seed uses the first country_info row per currency code, same as Frappe's `added_currencies` set. I did not diff every currency row against a live ERPNext site.
- `get_doc` and `new_doc` still catch `Exception` and fall back to a bare `Document` when the controller import fails. That was left in place. It is broader than defect 5's rule for `get_doc_before_save`.
