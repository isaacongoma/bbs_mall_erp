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