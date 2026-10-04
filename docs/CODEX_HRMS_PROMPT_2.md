# Codex: unblock the environment, finish HRMS Stage 1, then port Stage 2 (Leaves)

Written for: Codex, working autonomously in `D:\Clients\BBS-ERP`. Backend only. This extends `docs/CODEX_HRMS_PORT_PROMPT.md` (rules, method, stages) and `docs/CODEX_ERP_PORT_PROMPT.md`. Read both, plus `docs/agent_logs/CODEX_HRMS_PROGRESS.md`, `docs/ERP_PORT_STATUS.md` and `docs/ERP_PORT_DEVIATIONS.md`.

## 0. The standard: enterprise-grade, exact upstream code

This is an enterprise ERP. The port must carry the real upstream source, not an approximation.
- Every ported controller, helper, whitelisted method, scheduler function, patch-free install step and report is the upstream HRMS source from `vendor/hrms/hrms`, translated only for idiom (tabs, import roots, comment stripping by `backend/scripts/port_controller.py`). Same function names, signatures, control flow, SQL/query logic, rounding, error messages and `_()` strings.
- No stubs, no `pass` placeholders, no "tolerated missing dependency", no no-op replacements, no simplified logic, no inventing helpers that upstream does not have. If upstream code needs a framework or ERPNext function that is missing, port that function from `vendor/frappe` or `vendor/erpnext` into our tree (use `extract_functions.py`, `add_document_methods.py`, `import_loop.py`) instead of working around it. Never wrap an upstream call in try/except to hide a missing module.
- The two existing HRMS shortcuts must be removed: `hr_settings.py` tolerating a missing `erpnext.utilities.naming.set_by_naming_series` (port that function exactly), and `leave_type.py` resolving the payroll `LEAVE_TYPE_MAP` lazily to dodge an import (port the dependency or, if it genuinely belongs to the Payroll stage, port that module now). Also finish the deferred Shift Type and Holiday List Assignment controllers with the full upstream code, pulling in the later-stage dependencies they need (Attendance, Employee Checkin, Shift Assignment, payroll `DuplicateAssignment`) as real ported modules.
- A deviation is allowed only when the feature cannot exist in this architecture (RQ queues, desk UI, website). Each one goes into `docs/ERP_PORT_DEVIATIONS.md` with the upstream file, what differs and why. When in doubt, port the upstream behaviour.
- Tests: port the upstream tests from `vendor/hrms/hrms/**/test_*.py` next to the controllers and make them pass unchanged except for the harness. Add oracle parity (section 5 of `CODEX_HRMS_PORT_PROMPT.md`) for ledger and computed values. A test that cannot fail is not a test.
- No code comments, no docstrings, no lint-disable directives, no git commits. Do not edit ERPNext accounts/stock/selling/buying/assets code or tests (Claude is working there); additive framework changes in `apps/frappe` are allowed if logged.

## 1. Step 1: fix the command execution problem first

Your earlier report said `backend\.venv\Scripts\python.exe` failed with "did not find executable at C:\Users\ongom\AppData\Local\Programs\Python\Python313\python.exe: Access is denied". Diagnosis: `backend\.venv\pyvenv.cfg` points at a base interpreter inside the user profile, and your sandbox cannot read that directory. The file itself is fine and readable by the user account.

Do this, in order, and record the outcome in `docs/agent_logs/CODEX_HRMS_PROGRESS.md`:
1. Re-test: run `backend\.venv\Scripts\python.exe --version`. If it works now, continue to step 2.
2. If it still fails, do not hand-write migrations or skip tests. Create a second venv that your sandbox can read, outside the user profile: find any readable Python 3.13 (for example `C:\Python313`, `C:\Program Files\Python313`, or install one under `D:\Python313` with the Windows installer in per-machine mode), then `D:\Python313\python.exe -m venv D:\Clients\BBS-ERP\backend\.venv-codex` and `.venv-codex\Scripts\python.exe -m pip install -r backend\requirements\base.txt` (also install whatever `backend\requirements\*.txt` the tests need). Use `.venv-codex` for all your runs. Do not modify or delete `backend\.venv`; Claude uses it.
3. If neither is possible, stop and write the exact error output and the exact commands you tried into the progress log. Do not continue by editing code you cannot run.
4. Always set your own test database: `$env:TEST_DATABASE_NAME = "test_bbs_erp_codex"` before any `manage.py test`, and always pass `--noinput`. Never use `test_bbs_erp` (Claude's runs and yours collided there and caused the 150 baseline errors you reported; the suite was green at 288 tests when run alone).
5. Prove the environment: `manage.py check`, `makemigrations --check --dry-run`, then the full suite. Report real counts. Tests from `apps.hrms.tests.test_stage1_setup` currently fail (6 of them: Leave Type / Employment Type models unknown, HR Settings not registered, hook merge missing Expense Claim); that is your first bug list.

## 2. Step 2: make Stage 1 real

- Replace the hand-written `apps/hrms/migrations/0001_initial.py` with `makemigrations hrms` output; diff the two and note differences. `makemigrations --check --dry-run` must be clean.
- Fix the six failing tests by fixing the registry and generator wiring, not the tests. Doctypes from `apps/hrms` must resolve through `get_model`, `get_meta`, `get_controller`, `get_doc` exactly like ERPNext ones.
- The Expense Claim / hook problem: HRMS hooks add doctypes (Expense Claim and others) to ERPNext hook lists (`repost_allowed_doctypes`, accounting dimension lists, etc.) before those doctypes exist. That broke ERPNext's post-migrate fixtures (`DoesNotExistError: Expense Claim`). The faithful fix is to port those doctypes in their stages and, until then, make hook consumers see only doctypes that are registered, implemented once in the hook loader. Log it in the deviations file with the removal condition ("remove when Expense Claim is ported").
- Port HRMS install: `hrms.install.after_install` custom fields (Employee, Department, Designation, etc.), roles, default records (leave types, salary components that upstream installs, HR settings defaults) via the existing Custom Field and fixtures machinery. No scaffold placeholders.
- Verify: full suite green, `check` clean, migrations clean, upstream tests for the Stage 1 doctypes passing. Update the three docs. Only then go on.

## 3. Step 3: Stage 2, Leaves (port every file in `vendor/hrms/hrms/hr/doctype` and `vendor/hrms/hrms/leaves` that belongs to leave management)

Doctypes: Leave Period, Leave Policy, Leave Policy Detail, Leave Policy Assignment, Leave Allocation, Leave Application, Leave Ledger Entry, Leave Block List (+ Allow, Date), Leave Encashment, Compensatory Leave Request, Leave Adjustment, Leave Control Panel, Earned Leave Schedule, Holiday List Assignment (finish), plus `hrms/hr/utils.py`, `hrms/controllers/*`, `hrms/mixins/*`, the leave related parts of `hrms/api`, and every function in `hooks.py` `scheduler_events` / `doc_events` that touches leaves (earned leave allocation, leave expiry/carry forward, auto-allocation, leave application email reminders). Register those scheduler events on the Celery bridge exactly as listed in the hooks.

Required behaviour, all from upstream code: leave balance calculation (`get_leave_balance_on`, `get_leave_details`, carry forward, expiry, encashment, LWP, half-day and holiday handling, overlap, block list, max continuous days, allocation validation), Leave Ledger Entry creation/cancellation on submit/cancel of Allocation, Application and Encashment, Leave Policy Assignment granting allocations including earned leave on the schedule, and all permission and approver rules (leave approver, department approver).

Parity: write `spike/oracle_leave_*.py` scenarios (install HRMS into the oracle site as in the HRMS prompt; if not possible, say so in the report and rely on the ported upstream tests) and compare Leave Ledger Entry rows (employee, leave_type, transaction_type/name, leaves, from_date, to_date, is_carry_forward, is_expired, is_lwp) and balances exactly. Port and run the upstream leave tests (`test_leave_allocation.py`, `test_leave_application.py`, `test_leave_policy_assignment.py`, `test_leave_encashment.py`, `test_leave_ledger_entry.py`, `test_compensatory_leave_request.py`, etc.).

## 4. Step 4: Kenya payroll data module (can run alongside Step 3)

Inside HRMS regional style (`apps/hrms/regional/kenya/`), no stubs: PAYE bands and personal/insurance relief, NSSF tiered contributions (Tier I/II with upper earnings limits), SHIF, Affordable Housing Levy, NITA, as one data module plus calculation functions, exposed to Salary Components through the same mechanisms upstream India regional code uses (formula, `statistical`/`variable_based_on_taxable_salary`, or condition). Use the statutory rates in force on the implementation date, state the effective date and source for every rate in the progress log, and keep every number in the single data module. Tests at the bracket edges (gross 24,000; 32,333; 500,000; 800,000), below-threshold, and rounding.

## 5. Reporting

After each step: run the full suite on your own database, `check`, `makemigrations --check --dry-run`; update `docs/ERP_PORT_STATUS.md` (one row per doctype/controller/report/hook/scheduler job with honest status), `docs/ERP_PORT_DEVIATIONS.md`, and append to `docs/agent_logs/CODEX_HRMS_PROGRESS.md` what was done, what was verified and how (with actual counts), known gaps and decisions. Do not start the next step until the previous one is green. If you are blocked, write exactly why and stop; never mark something verified that you did not run.
