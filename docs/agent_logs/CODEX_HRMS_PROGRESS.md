# Codex HRMS Progress

## 2026-10-03 Stage 1 Start

Done:
- Read `CODEX_HRMS_PORT_PROMPT.md`, ERP port prompt/plan/status/deviations, and Claude progress tail before editing.
- Added `apps.hrms` Django app, `hrms.*` import alias support, HRMS hook loading, HRMS-aware doctype registry lookup and override-doctype resolution.
- Extended generator/tooling for HRMS sources and generated Stage 1 setup masters from `vendor/hrms/hrms`.
- Added HRMS Stage 1 generated models/controllers/metadata for HR Settings, Employment Type, Employee Grade, Designation Skill, Leave Type, Holiday List Assignment, Shift Type, Identification Document Type and Interest.
- Ported importable Stage 1 controller logic for HR Settings and Leave Type. Left Shift Type and Holiday List Assignment as generated because their full upstream controllers pull later Attendance/Payroll stages forward.
- Added manual additive migration `hrms.0001_initial` and HRMS Stage 1 tests.

Verified:
- Before HRMS edits, `manage.py check` passed and `makemigrations --check --dry-run` reported no changes.

Blocked:
- Before HRMS edits, `manage.py test --noinput` was already failing: 223 tests ran, 150 errors and 1 failure, then teardown could not drop `test_bbs_erp` because another session was connected.
- After that baseline run, `.venv\Scripts\python.exe` failed with `did not find executable at ... Python313\python.exe: Access is denied`; the base Python path was not visible to PowerShell. Because of that, HRMS migrations/tests/checks could not be executed after edits.

Known gaps:
- HRMS Stage 1 is not verified in Django yet because Python execution is blocked.
- Full Shift Type controller waits for Attendance/Shift stage.
- Holiday List Assignment controller waits for Payroll/leave-assignment dependencies.
- HRMS install fixtures/custom fields are scaffolded only; upstream install records are not ported yet.
- Kenya payroll not started.

## 2026-10-04 Stage 1 Verification

Done:
- Re-tested `backend\.venv\Scripts\python.exe --version`; it still fails because the venv points at `C:\Users\ongom\AppData\Local\Programs\Python\Python313\python.exe`, which returns `Access is denied`.
- Tested readable Python alternatives. `C:\Program Files\pgAdmin 4\python\python.exe` is Python 3.13 and can run the backend when `backend\.venv\Lib\site-packages` and `backend` are inserted into `sys.path`; it cannot create `.venv-codex` because the embedded distribution has no `venv` module.
- Replaced the hand-written HRMS migration with Django-generated `apps.hrms 0001_initial`.
- Fixed HRMS Stage 1 hook expectation to assert that unregistered `Expense Claim` is filtered from hook consumer lists and recorded in `SKIPPED_UNREGISTERED_HOOK_DOCTYPES`.
- Made `generate_doctypes` skip identical JSON/generated-model writes so the idempotency test no longer rewrites files during the suite.

Verified:
- `manage.py check`: `System check identified no issues (0 silenced)`.
- `manage.py makemigrations --check --dry-run`: `No changes detected`.
- `apps.hrms.tests.test_stage1_setup --noinput`: 6 tests, OK.
- `apps.erpnext.tests.test_foundation.ErpnextFoundationTests.test_generate_doctypes_is_idempotent_for_pilot_set --noinput`: 1 test, OK.
- `apps.erpnext.accounts.doctype.journal_entry.test_journal_entry_parity --noinput`: 6 tests, OK.
- Full `manage.py test --noinput` from `backend` using `TEST_DATABASE_NAME=test_bbs_erp_codex`: 349 tests discovered, 17 errors.

Blocked:
- Full-suite errors are in newly added Projects/Employee tests outside the HRMS Stage 1 slice: missing upstream test helper modules for Sales Order, Sales Invoice, Stock Entry and User Permission; missing `_Test Employee` fixture rows for Activity Cost; Task assignment/overdue/report expectations; and `User` metadata not registered for Employee user-creation tests.
- Stage 2 Leaves was not started because the full suite is not green.
