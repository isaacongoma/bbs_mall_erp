# Antigravity: take over the HRMS port (Codex ran out of usage)

Written for: Antigravity, working autonomously in `D:\Clients\BBS-ERP`. Backend only (`backend/`). Do not touch `frontend/`.

You take over the HRMS port from Codex. The full brief is already written: read, in this order, `docs/CODEX_HRMS_PORT_PROMPT.md`, `docs/CODEX_HRMS_PROMPT_2.md`, `docs/CODEX_HRMS_PROMPT_3.md` (the current assignment: Step A carry-overs, Step B leaves, Step C Kenya payroll), `docs/ONE_SYSTEM_PLAN.md`, `docs/agent_logs/CODEX_HRMS_PROGRESS.md`, `docs/ERP_PORT_STATUS.md`, `docs/ERP_PORT_DEVIATIONS.md`. Everything in them applies to you exactly as it applied to Codex (enterprise standard: exact upstream source from `vendor/hrms/hrms`, no stubs, no tolerated-missing imports, no invented helpers, no comments or docstrings, no lint-disable directives, no git commits, additive migrations only, no fabricated verification). Where those documents say "Codex" read "you".

## 1. Lanes (three agents share one tree; stay in yours)

- You: `backend/apps/hrms/**`, `vendor/hrms` (read only), `backend/apps/hrms/tests/**`, HRMS oracle scripts `spike/oracle_hrms_*.py` and fixtures under `backend/apps/hrms/tests/oracle/`, your docs: `docs/agent_logs/ANTIGRAVITY_HRMS_PROGRESS.md`.
- Gemini: the ERPNext modules projects, support, maintenance, quality_management, ERPNext-side crm, utilities, telephony, communication, portal, bulk_transaction, edi, plus the Frappe User/Employee gap. Do not edit those.
- Claude: `apps/core`, `apps/crm` (legacy CRM merge), `apps/frappe` framework, `apps/erpnext` accounts/stock/selling/buying/assets/controllers, `apps/erpnext/registry.py`, `apps/erpnext/install.py`, the generator. If HRMS needs a change there, make it small and additive, log it in `docs/ERP_PORT_DEVIATIONS.md` under "Framework change requested by HRMS", and re-run the suites; do not rewrite shared files.

## 2. Current state you inherit (2026-10-04)

- `apps/hrms` is a Django app; `hrms.*` imports alias to `apps.hrms.*`; hooks merge; the registry scans `apps/hrms`.
- All 152 HRMS doctypes are generated (models, JSON, controller stubs) with migrations. Controllers are ported for HR Settings, Leave Type and a few others; most are generated stubs and must be ported from `vendor/hrms/hrms` file by file.
- `apps/hrms/payroll/doctype/salary_slip/salary_slip.py` only holds the upstream cache-key constants. The real Salary Slip (2,831 lines) is not ported yet; Holiday List, leave and payroll code depend on it.
- HRMS hooks run on Company creation (`hrms.overrides.company`): they create the "Expense Claims" account and Salary Components. Company/Holiday List/Department tests pass with that in place.
- Employee tests (`apps.erpnext.setup.doctype.employee`) fail because the Frappe User controller is not ported (`frappe.core.doctype.user` missing; User is keyed by integer pk in `apps/core`, by email in the ERP code). Gemini owns that gap. Exclude those four tests from your gate and say so in your report.
- One system: Employee, Holiday List, Department, Designation, Company, Branch, Cost Center, Account, Payment Entry and Journal Entry are the ERPNext ones. Users are mapped only through `apps/core/identity.py`. See the "One system rule" at the end of the Codex prompts; it binds you.

## 3. Environment (do this first)

- Python: `backend\.venv\Scripts\python.exe`. If it fails with "Access is denied" or "did not find executable", stop and write the exact error and the commands you tried into your progress log. A working fallback used before is the pgAdmin Python 3.13 with `backend\.venv\Lib\site-packages` and `backend` on `sys.path`.
- Your own test database on every run: PowerShell `$env:TEST_DATABASE_NAME = "test_bbs_erp_antigravity"; cd backend; .\.venv\Scripts\python.exe manage.py test --noinput <labels>`. Never `test_bbs_erp`, never `--keepdb`.
- Always `--noinput`, also for `makemigrations --noinput` (an interactive prompt hangs the session).
- Run tests in slices (`apps.hrms`, then the suites listed below), not one long full-suite run: other agents are running tests, so a full run exceeds the 30-minute background limit. Slices: `apps.hrms`, `apps.erpnext.setup`, `apps.frappe`, `apps.erpnext.accounts.doctype.sales_invoice`, `apps.erpnext.accounts.doctype.journal_entry`, `apps.crm`.
- Baseline before you edit: `manage.py check`, `makemigrations --check --dry-run`, `apps.hrms`.

## 4. Assignment (follow `CODEX_HRMS_PROMPT_3.md`, steps A, B, C, then continue the stages)

1. Step A: remove the Stage 1 shortcuts (`set_by_naming_series` exact port; no lazy `LEAVE_TYPE_MAP` workaround; full Shift Type and Holiday List Assignment controllers; real HRMS install records and custom fields). The real `salary_slip.py` port is part of this, because `leave_type.py`, Holiday List and payroll import it: port it with `backend/scripts/port_controller.py` and its closure (`port_closure.py`, `import_loop.py`, `add_document_methods.py`) so the file is the upstream code. Do not leave the constants-only stub.
2. Step B: Stage 2 leaves in full (Leave Period/Policy/Policy Assignment/Allocation/Application/Ledger Entry/Block List/Encashment/Compensatory Leave/Adjustment/Control Panel, Earned Leave Schedule, utils, controllers, mixins, scheduler events on the Celery bridge), port the upstream tests, add oracle parity for Leave Ledger Entry rows and balances.
3. Step C (parallel): Kenya payroll rates module in `apps/hrms/regional/kenya/` with every rate and effective date in one data module and bracket-edge tests.
4. Then Stage 3 attendance/shift, Stage 4 expenses (post GL, compare against the oracle), Stage 5 payroll (Salary Slip rows, payroll Journal Entries), Stage 6 recruitment, performance, tenure, onboarding, separation.

## 5. Reporting

After each step: run your slices, `check`, `makemigrations --check --dry-run`; update `docs/ERP_PORT_STATUS.md` and `docs/ERP_PORT_DEVIATIONS.md`; append to `docs/agent_logs/ANTIGRAVITY_HRMS_PROGRESS.md` what was done, what was verified (exact commands and counts), known gaps, decisions. Report failures outside your lane as "not mine" with test names and carry on; never fix another agent's module. If blocked, write exactly why and stop.
