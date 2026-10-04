# Task for Codex: port HRMS into the BBS-ERP Django backend

Written for: Codex, working autonomously in `D:\Clients\BBS-ERP`. **Backend only.** Do not touch `frontend/` or `frontend-bk/`.

Scope is HRMS only. Claude is working on the ERPNext side (accounts, stock, parity tests) in the same tree at the same time, so do not edit ERPNext controllers, `apps/erpnext/accounts|stock|selling|buying|assets`, or their tests. If HRMS needs a change in shared framework code (`apps/frappe/*`, `apps/erpnext/setup`, registry, generator), keep it small and additive, re-run the full suite before and after, and record it in `docs/ERP_PORT_DEVIATIONS.md`.

Read first: `docs/CODEX_ERP_PORT_PROMPT.md` (rules, architecture and oracle method still apply, except that HRMS is now in scope), `docs/ERP_PORT_PLAN.md`, `docs/ERP_PORT_STATUS.md`, `docs/ERP_PORT_DEVIATIONS.md`, and the tail of `docs/agent_logs/CLAUDE_PROGRESS.md`.

## 1. Rules

- Faithful port: keep upstream method names, arguments, control flow and message text. Fix the framework, not the upstream logic.
- No code comments or docstrings, no lint-disable directives, no git commits.
- Native Django/DRF only; do not embed or call real Frappe/HRMS.
- Additive migrations only; archive before deleting anything.
- No fabricated parity: anything not ported or not tested is stated in the status ledger.
- Always run tests with `--noinput`: `cd backend; ./.venv/Scripts/python.exe manage.py test --noinput`. The suite is currently green (288 tests); keep it green. Also `manage.py check` and `makemigrations --check --dry-run` must be clean after each stage.
- Windows host, venv `backend/.venv/Scripts/python.exe`.

## 2. Current framework state

- `apps/frappe` is the runtime and `apps/erpnext` the ported ERPNext. Upstream imports (`import frappe`, `from erpnext.x import y`) resolve to our tree via the meta-path finder in `backend/config/settings/base.py`.
- Mechanical tooling in `backend/scripts/`: `port_controller.py` (vendor file to our tree: tabs to spaces, comments stripped, TYPE_CHECKING blocks removed), `port_closure.py`, `import_loop.py` (imports a module, auto-ports missing frappe/erpnext modules, pip-installs missing packages), `port_stubs.py`, `extract_functions.py`, `add_document_methods.py`, `doc_method_loop.py`, `add_doctypes.py`, `collect_doctypes.py`, `check_imports.py`, `port_all_controllers.py`. Read them before writing new tooling and prefer them over retyping.
- Generator: `manage.py generate_doctypes [--skip-checks]` reads the PILOT list and `apps/erpnext/management/auto_doctypes.json`, copies doctype JSON, writes `_generated.py`, controller stub and `generated_models.py`. Child tables are auto-included, single doctypes have no table.
- Customisation: Custom Field and Property Setter overlays live in `apps/frappe/custom/` and `apps/erpnext/registry.py` (`get_model` syncs custom fields into dynamic Django fields plus ALTER TABLE).
- Background jobs run on Celery through `apps/frappe/utils/background_jobs.py` and `tasks.py`; hooks come from `apps/frappe/hooks.py` and `apps/erpnext/hooks.py`.
- Oracle: a real ERPNext v17 install exists in `spike/` (see section 3 of the old brief for how to run it).

## 3. Source and exclusions

Source: `vendor/hrms/hrms` (Frappe HRMS, commit 8220971, cloned). Modules to port: `hr` (115 doctypes), `payroll` (44), `leaves`, `expenses`, `shift_and_attendance`, `recruitment`, `performance`, `tenure`, `tax_and_benefits`, `hr_setup`, `controllers`, `overrides`, `mixins`, `utils`, `api`, `setup_wizard.py`, `install.py`, `hooks.py`.

Do not port: `www`, `public`, `frontend`, `frappe-ui`, `locale`, `workspace_sidebar`, `desktop_icon`, `dock`, `telemetry.py`, `subscription_utils.py`, `uninstall.py`, India regional code under `regional`. List the exclusions in `docs/ERP_PORT_STATUS.md`.

## 4. Method

1. Add `apps/hrms` as a Django app (`HrmsConfig`, in INSTALLED_APPS) and extend the alias finder so `hrms.x` imports resolve to `apps.hrms.x`. Extend `port_controller.py` VENDOR/TARGET maps and `generate_doctypes` to read `vendor/hrms/hrms/<module>/doctype/*/*.json`. Table names stay `tab<DocType>`.
2. HRMS customises ERPNext doctypes (Employee, Department, Designation, Holiday List, Company, Salary-related links). Port `hrms/hooks.py` `override_doctype_class`, `doc_events`, `scheduler_events`, `fixtures`, `after_install`, and the custom-field creation from `install.py`/`setup.py` through the existing Custom Field and Property Setter machinery. Employee stays the ERPNext `setup` doctype with HRMS layered on, as upstream. Track unresolved hook handlers the way `UNRESOLVED_HOOK_HANDLERS` does.
3. Generate doctypes, then port controllers with `port_stubs.py` and `import_loop.py`, then helper modules with `port_closure.py`. Add framework methods only as needed and keep them upstream-faithful.
4. Scheduler and background work (earned leave allocation, auto attendance, payroll entry, leave expiry) goes through the Celery bridge; register scheduler events from the hooks.
5. Tests: port the upstream tests under `vendor/hrms/hrms/**/test_*.py` wherever they can run, adapting only the harness. For anything that posts to the ledger or computes pay, add oracle parity: install HRMS into the `spike/` oracle site (add `vendor/hrms` to PYTHONPATH and run `hrms.install.after_install`), write `spike/oracle_<scenario>.py` printing JSON to `spike/out/`, commit fixtures under `backend/apps/hrms/tests/oracle/`, and compare exactly. If the oracle cannot be installed, say so and derive expected values by hand from upstream tests, marking those tests as not oracle-verified.

## 5. Stages (finish and verify one before the next)

1. Setup masters: HR Settings, Employment Type, Employee Grade, Designation Skill, Leave Type, Holiday List Assignment, Shift Type, Identification Document Type, Interest.
2. Leaves: Leave Policy, Leave Policy Assignment, Leave Allocation, Leave Application, Leave Ledger Entry, Leave Period, Leave Block List, Leave Encashment, Compensatory Leave Request, Leave Adjustment, earned-leave and expiry schedulers. Parity: ledger rows and balances.
3. Attendance and shift: Attendance, Attendance Request, Employee Checkin, Shift Assignment, Shift Request, auto attendance from checkins, Employee Attendance Tool.
4. Expenses: Expense Claim (+ detail, taxes, advances), Expense Claim Type, Employee Advance. These post GL; compare GL rows with the oracle.
5. Payroll: Salary Component, Salary Structure (+ Assignment), Salary Slip, Payroll Entry, Payroll Period, Additional Salary, Employee Incentive, Retention Bonus, Employee Benefit Application and Claim, Employee Tax Exemption declarations and proofs, Full and Final Statement, Gratuity. Parity: every Salary Slip earnings and deductions row, net pay, rounding, payroll Journal Entries.
6. Recruitment, performance, tenure, onboarding, separation, transfer, promotion, grievance, training.

## 6. Kenya payroll

Implement inside the HRMS regional style, not a separate app: PAYE bands and personal relief, insurance relief, NSSF (tiered), SHIF, Affordable Housing Levy, NITA, as Salary Components plus a Kenya Salary Structure installed with the Kenya fixtures. Keep every rate, band and cap in one data module so it is easy to update, use the statutory values current when you implement, and state the effective date of each in your report. Tests cover bracket edges (for example gross 24,000, 32,333, 500,000, 800,000) and rounding.

## 7. Reporting

After each stage update `docs/ERP_PORT_STATUS.md` (one row per doctype, controller, report, hook, scheduler job, with status `not started | generated | controller ported | tested | oracle-verified`), record deviations in `docs/ERP_PORT_DEVIATIONS.md`, and append a short entry to `docs/agent_logs/CODEX_HRMS_PROGRESS.md`: what was done, what was verified and how, known gaps, decisions. Do not start the next stage until the suite, `check` and `makemigrations --check` are green.
