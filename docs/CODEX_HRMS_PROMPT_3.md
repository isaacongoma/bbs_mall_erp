# Codex: proceed to HRMS Stage 2 (Leaves), clear the Stage 1 carry-overs, build the Kenya payroll rates

Written for: Codex, continuing in `D:\Clients\BBS-ERP`. Backend only. This continues `docs/CODEX_HRMS_PROMPT_2.md` (read it again, with `docs/CODEX_HRMS_PORT_PROMPT.md`, `docs/agent_logs/CODEX_HRMS_PROGRESS.md`, `docs/ONE_SYSTEM_PLAN.md`). The enterprise standard of those prompts is unchanged: exact upstream source from `vendor/hrms/hrms`, no stubs, no tolerated-missing imports, no invented helpers, no comments, no git commits.

## 0. Feedback on your last report

Good: Stage 1 is verified (6 tests, `check`, `makemigrations --check`), the generated migration replaced the hand-written one, the hook filtering is recorded in `SKIPPED_UNREGISTERED_HOOK_DOCTYPES`, and you reported real counts and the exact blocker.

Corrections:
1. You did not start Stage 2 because the full suite had 17 errors. Those errors are Gemini's in-progress Projects/Employee work, not yours. From now on your gate is: the HRMS tests, plus every test outside `apps.erpnext.projects`, `apps.erpnext.support`, `apps.erpnext.maintenance`, `apps.erpnext.quality_management`, `apps.erpnext.crm`, `apps.erpnext.utilities`, `apps.erpnext.telephony`, `apps.erpnext.communication`, `apps.erpnext.portal`, `apps.erpnext.bulk_transaction`, `apps.erpnext.edi` and `apps.crm`, must pass. Report failures in those excluded areas as "not mine" with test names, and carry on. Never fix another agent's module, and never skip your own.
2. The Stage 1 carry-overs in prompt 2 are still open. They are due before or inside Stage 2 (section 2).
3. `apps.core`, `apps.crm` and `apps/erpnext/registry.py` changed under you (see section 1). Pull that in before continuing.

## 1. Changes made by Claude that you must pick up

- Currency, Comment and File now live only in the ERPNext tables (`tabCurrency`, `tabComment`, `tabFile`). The legacy `crm.Currency`, `core.Comment` and `core.FileAttachment` models and tables are removed by migrations (`crm 0030-0032`, `core 0015-0017`). Do not reintroduce them.
- `apps/core/identity.py` is the one place that maps users between the integer pk and the email string (`user_email`, `user_pk`, `user_pks_by_email`, `user_emails_by_pk`). Use it. Never write another mapper.
- `apps/erpnext/registry.py` scans `apps/hrms` and resolves HRMS models and controllers. `Database.escape` now returns a quoted literal; `Database.is_missing_column/is_table_missing` exist; `Document` has `_submit`/`_cancel`/`_table_fieldnames`; `new_doc(parent_doc=..., parentfield=...)` works; documents load numeric values as `float`.
- Your own test database every run: `TEST_DATABASE_NAME=test_bbs_erp_codex`, `--noinput`.
- Re-run `check`, `makemigrations --check --dry-run` and the Stage 1 tests once now to confirm nothing broke.

## 2. One system (mandatory)

BBS-ERP is one system. Every doctype has one table, every function one implementation, and all modules use the same records through `apps/frappe` and the registry. HRMS must attach to the existing records, not beside them:
- Employee stays the single ERPNext Employee. Its user link goes to the existing User via `apps/core/identity.py` and the canonical `owner`/`user_id` email convention.
- Holiday List, Department, Designation, Company, Branch, Cost Center, Account, Payment Entry and Journal Entry are the ERPNext ones. Leave Application, Expense Claim and Salary Slip reference them by link exactly as upstream does. No HRMS copies.
- Before creating any model, helper or API, search `apps/core`, `apps/crm`, `apps/frappe`, `apps/erpnext`, `apps/hrms`. Reuse. Do not copy a function across modules.
- Unifying storage never changes behaviour. If it would, stop and report.

## 3. Step A: clear the Stage 1 carry-overs (do first, small)

1. Port `erpnext.utilities.naming.set_by_naming_series` exactly, and remove the tolerance for its absence in `apps/hrms/hr/doctype/hr_settings/hr_settings.py`.
2. Remove the lazy payroll `LEAVE_TYPE_MAP` import workaround in `leave_type.py`: port the dependency it needs (the `hrms.payroll.doctype.salary_slip.salary_slip` pieces, in full, as part of the Payroll files you will need anyway, or the minimal real module that upstream imports) so `leave_type.py` is the upstream code.
3. Write the full upstream Shift Type controller and the full Holiday List Assignment controller, porting the later-stage modules they import (Attendance, Employee Checkin, Shift Assignment, payroll `DuplicateAssignment`) as real ported files. Their doctypes and controllers can be generated and ported even if their own stages come later.
4. Port the real HRMS install: `hrms.install.after_install` custom fields on ERPNext doctypes (Employee, Department, Designation, Company, Holiday List, etc.), roles, default records. Install them idempotently from `install_base_fixtures` the same way ERPNext's custom fields are, so a fresh database and an existing one both end up identical.
5. Verify, log, update the three docs.

## 4. Step B: Stage 2 Leaves (full, exact)

Port every file under `vendor/hrms/hrms/hr/doctype` and `vendor/hrms/hrms/leaves` that belongs to leave management: Leave Period, Leave Policy (+ Detail), Leave Policy Assignment, Leave Allocation, Leave Application, Leave Ledger Entry, Leave Block List (+ Allow, Date), Leave Encashment, Compensatory Leave Request, Leave Adjustment, Leave Control Panel, Earned Leave Schedule, plus `hr/utils.py`, `controllers/*`, `mixins/*`, leave-related `api`, and every `scheduler_events`/`doc_events` handler in the HRMS `hooks.py` that touches leaves (earned leave allocation, leave expiry and carry forward, auto allocation). Register scheduler events on the Celery bridge as the hooks list them.

Required behaviour, all from upstream code: `get_leave_balance_on`, `get_leave_details`, carry forward, expiry, encashment, LWP, half-day and holiday handling, overlap, block list, max continuous days, allocation validation, Leave Ledger Entry creation and reversal on submit/cancel, earned leave schedule, leave approver and department approver rules. Port the upstream tests (`test_leave_allocation.py`, `test_leave_application.py`, `test_leave_policy_assignment.py`, `test_leave_encashment.py`, `test_leave_ledger_entry.py`, `test_compensatory_leave_request.py`, `test_leave_period.py`, `test_leave_block_list.py`, others in those folders) next to the controllers; harness-level edits only. Add behaviour tests that cannot pass trivially (assert exact ledger rows and balances).

Parity: write `spike/oracle_leave_*.py` (install HRMS into the oracle site by adding `vendor/hrms` to PYTHONPATH and running `hrms.install.after_install`; run from `spike/sites` with the PYTHONPATH recipe in `docs/CODEX_ERP_PORT_PROMPT.md`; note the oracle site's Series counters and Territory were reset by an earlier script, see `spike/oracle_si_scenarios.py` for the fix). Save JSON under `backend/apps/hrms/tests/oracle/`. Compare Leave Ledger Entry rows (employee, leave_type, transaction_type, transaction_name, leaves, from_date, to_date, is_carry_forward, is_expired, is_lwp) and balances exactly. If the oracle cannot be installed, say so and mark those tests not oracle-verified.

## 5. Step C: Kenya payroll rates (parallel with B)

`apps/hrms/regional/kenya/`: one data module with every statutory number and effective date (PAYE bands, personal relief, insurance relief, NSSF tiers and limits, SHIF, Affordable Housing Levy, NITA) plus calculation functions, wired to Salary Components the way upstream India regional code wires its formulas. State the effective date and source of every rate in the progress log. Tests at bracket edges (gross 24,000; 32,333; 500,000; 800,000), below threshold, rounding. No ledger or Salary Slip dependency yet.

## 6. Reporting

After each step: full run on your own database (report the counts and the excluded areas separately), `check`, `makemigrations --check --dry-run`; update `docs/ERP_PORT_STATUS.md`, `docs/ERP_PORT_DEVIATIONS.md` and append to `docs/agent_logs/CODEX_HRMS_PROGRESS.md` (done, verified with commands and counts, known gaps, decisions). If blocked, write the exact error and stop; never mark something verified that you did not run.
