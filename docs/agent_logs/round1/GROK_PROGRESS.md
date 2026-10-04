## Step 0 suite repair 2026-10-03 13:44:13
Result: done
Files changed: backend/apps/frappe/apps.py, backend/apps/frappe/testing.py, backend/apps/frappe/model/document.py, backend/apps/frappe/locale.py, backend/apps/frappe/runtime.py, backend/apps/frappe/utils/__init__.py, backend/apps/frappe/tests/test_utils.py, backend/apps/erpnext/setup/doctype/customer_group/customer_group.py, backend/apps/erpnext/migrations/0003_seed_currencies.py, backend/requirements/base.txt
Commands run and last lines of output (tests: count, OK/FAILED)
`cd backend; .venv\Scripts\python.exe manage.py test --verbosity 1`
First run this session, before the fixes below: Found 126 test(s). FAILED (errors=22).
Final Step 0 run, before the defect tests were added: Found 126 test(s). Ran 126 tests in 45.299s. OK.
Root causes / decisions
- `Territory()`, `CustomerGroup()`, and `Company()` took no arguments because `NestedSet` did not subclass `Document`. `ItemGroup` and `CostCenter` already listed `Document` in their bases, so they still constructed. `class NestedSet(Document)` was already in the tree at the start of this continuation.
- `import frappe` and `import apps.frappe` were two module objects. A meta-path alias in `config/settings/base.py` was already present. Fiscal-year tests that `import frappe` then saw the same `NameError`.
- `test_utils` could not finish importing. Missing `frappe.utils` names were already added. The remaining import error was `@TestCase.change_settings` on Django's `TestCase`. Frappe registers that context manager on its test case and the copied rounding tests use it to set `System Settings.rounding_method`. `apps/frappe/testing.py` supplies the helper and `AppConfig.ready` attaches it. `get_system_settings` already merges `local.system_settings`.
- Hypothesis `@given` refuses Django's `TestCase`. The copied tests were switched to `hypothesis.extra.django.TestCase`. Assertions were not removed.
- `Filters` was already a real class, `comma_and` already used lang `en`, and `cast("Data")` already had `as_unicode`. Those three failures from the handoff were gone before this continuation's first suite run.
- Empty tree parents were stored as NULL. `Territory.validate` and `Company.validate_parent_company` assign `get_root_of()`, which returns None when no root exists. Generated Link columns are `NOT NULL` with default `''`. `db_insert` / `db_update` now coerce None to `''` for non-null string fields.
- `test_document_engine_update_after_submit_requires_allow_on_submit` raised `TimestampMismatchError` on the save after a rejected update-after-submit. `set_user_and_timestamp` advanced `self.modified` before `validate_update_after_submit` raised, so the next `check_if_latest` compared a timestamp that was never written. A failed `save` now restores `modified` and `modified_by` when `db_update` has not run. Successful writes still reload `modified` from the database.
- `CustomerGroup.validate` called `get_model("Account")` before the accounts loop. Upstream only calls `get_cached_value` when a row has an account. The controller was aligned to that. Account is still not a generated model.
- `money_in_words` imported `get_defaults`, called `db.get_value(..., cache=True)`, and expected `get_number_format().string` plus `num2words`. `get_defaults` returns an empty mapping because DefaultValue is not ported. Currency fraction rows are seeded from `country_info.json`. `num2words~=0.5.14` was installed and added to `requirements/base.txt`. `_()` no longer treats the translation `context` argument as `str.format` keyword.
Not done / known gaps
- `get_defaults` does not read a DefaultValue table.
- `pypika` is not installed. `types/filter.py` still uses a local `Column` placeholder.
- `whitelist` and `validate_and_sanitize_search_inputs` are thin wrappers so copied utils modules import. They are not the REST contract.
- Many classes in `test_utils.py` are still `pass`. The methods that are implemented ran and passed.

## Step 1 review defects 1-7 2026-10-03 13:44:13
Result: done
Files changed: backend/apps/frappe/model/document.py, backend/apps/frappe/tests/test_document.py, docs/ERP_PORT_BLOCK1_REPORT.md, docs/ERP_PORT_STATUS.md
Commands run and last lines of output (tests: count, OK/FAILED)
`cd backend; .venv\Scripts\python.exe manage.py test apps.frappe.tests.test_document --verbosity 1`
Found 7 test(s). Ran 7 tests in 0.369s. OK.
`cd backend; .venv\Scripts\python.exe manage.py test --verbosity 1`
Found 129 test(s).
Ran 129 tests in 28.253s
OK
Destroying test database for alias 'default'...
Root causes / decisions
1. `check_if_latest` raises `TimestampMismatchError` when the database `modified` differs from the loaded value. `test_stale_document_save_fails` saves one copy and expects the other copy to fail. The old `except Exception: pass` around the raise is not in the current method. A failed save no longer dirties `modified`, which was hiding a real later mismatch.
2. `submit()` sets `_action = "submit"`, `docstatus = 1`, and `save()`. `run_before_save_methods` runs `before_submit`. `run_post_save_methods` runs `on_submit` and then `on_change`. The test asserts that order and that docstatus 1 is stored.
3. `cancel()` sets `_action = "cancel"`, `docstatus = 2`, and `save()`. `test_cancel_does_not_persist_when_before_cancel_fails` proves a `before_cancel` error leaves docstatus 1. Hook order is `before_cancel`, `on_cancel`, `on_change`.
4. `validate_higher_perm_levels` resets permlevel > 0 fields when the user's roles have no write permission at that level. It now calls `get_roles()` so the session user is resolved. A string passed into `get_roles` was treated as anonymous and always became Guest. `test_higher_permlevel_resets_field_without_write_access` covers both the reset and the allowed case. `check_no_back_links_exist` / `check_if_doc_is_linked` scan generated models for static Link fields. `test_delete_is_blocked_when_another_document_links_here` deletes a Company that a Cost Center points at and expects `LinkExistsError`. This is not a port of `frappe/model/delete_doc.py`.
5. `get_doc_before_save` returns None for `DoesNotExistError` and Django `ObjectDoesNotExist`. Any other error propagates. The test expects None for a missing Branch name and `LookupError` for an unknown doctype.
6. `copy_doc` builds the copy with `get_doc`, so the result is the controller class. It clears `name`, `owner`, `creation`, `modified`, `modified_by`, `docstatus`, `amended_from`, and `amendment_date`, and does the same for child rows. `test_copy_doc_returns_correct_instance` checks the Branch controller, docstatus 0, cleared name and `amended_from`. Branch has no child table, so child clearing is untested.
7. `document.py` has no trailing-whitespace lines. The literal `` `r`n`r`n `` in `docs/ERP_PORT_BLOCK1_REPORT.md` was replaced with a paragraph break. Oracle fixtures were already under `backend/apps/frappe/tests/oracle/` (`lifecycle.json`, `naming.json`, `nestedset.json`, `rounding.json`). `test_200_random_operations` already existed and passed in the 129-test run. I did not regenerate those fixtures from `spike/` in this session.
Not done / known gaps
- Dynamic Link checks, singles, and the upstream link-exists message are not ported.
- `copy_doc` child `name` / `parent` clearing has no test on a real child row.
- `on_change` after submit is tested on Branch, which has no children. Child `docstatus` during cancel is not separately asserted.
- Step 2 has not been started as a completed item. Item Group still has a `pass` body in `validate_item_group_defaults`, and the upstream merge / preset / patch tests are absent because `rename_doc` is not ported.
