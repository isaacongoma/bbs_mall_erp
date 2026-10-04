# Handoff: continue and fix Block 1 of the ERPNext port (Gemini)

Written for: Gemini, taking over from Codex (usage limit reached until 14:00 local time) on `D:\Clients\BBS-ERP`. Backend only. Do not touch `frontend/` or `frontend-bk/`.

You are continuing an in-progress port. Do not restart it and do not redesign it. Read these files in this order before changing anything:

1. `docs/ERP_PORT_PLAN.md` (scope and phases)
2. `docs/CODEX_ERP_PORT_PROMPT.md` (the full execution brief: rules, architecture, blocks 1 to 8, verification list). Everything in it still applies to you.
3. `docs/CODEX_BLOCK1_REVIEW_COMMENT.md`, `..._2.md`, `..._3.md`, `..._5.md` (review findings, in order; later comments supersede earlier ones. Comment 3 corrects a wrong rounding claim)
4. `docs/ERP_PORT_STATUS.md` and `docs/ERP_PORT_BLOCK1_REPORT.md` (Codex's current ledger and report)

## Goal

Finish **Block 1** so it passes its acceptance tests, then stop and report. Do not start Block 2. The project owner reviews each block.

The product requirement, in one sentence: port ERPNext's actual methods and behaviour (not just fields and CRUD) into native Django/DRF, with results identical to real ERPNext v17.

## Non-negotiable rules (unchanged)

1. Faithful port from `vendor/erpnext/erpnext` and `vendor/frappe/frappe`. Keep method names, arguments, control flow and error messages. If the framework lacks a function a controller needs, implement that function in `apps/frappe`; never edit a ported controller to make it run.
2. Native Django/DRF only. No embedding or running real Frappe/ERPNext. No `apps/kenya`.
3. **No code comments, no docstrings explaining code, no lint-suppression directives.**
4. Do not touch the frontend or the CRM port's behaviour.
5. The repo has one git commit and almost everything is untracked. Anything you delete is gone: copy it to `D:\Clients\BBS-ERP-archive\<date>-<topic>\` first. Do not run `git commit`/`push` unless asked.
6. Never assert an expected number you have not checked against the oracle or the upstream test files.
7. Do not claim parity you did not test. Update the status ledger honestly (`generated | controller ported | tested | oracle-verified | not started`). A doctype is "controller ported" only when every vendor method is ported or listed as intentionally skipped.

## Environment

- Backend: `D:\Clients\BBS-ERP\backend`, venv `backend/.venv`, Python 3.13, Django 5.0, PostgreSQL 18 (`bbs_erp`/`bbs_erp`, localhost:5432; the role now has CREATEDB so isolated tests work).
- Run everything from `backend/` with `.venv/Scripts/python.exe` (Windows host; Git Bash and PowerShell both available). If a multi-line heredoc in bash fails with "unexpected EOF", write the file with your file-writing tool instead.
- Login for manual checks: `admin@bbs-erp.local` / `admin`. The dev server may not be running (start with `.venv/Scripts/python.exe manage.py runserver 0.0.0.0:8000` in the background if you need it).
- **Reference oracle:** a real ERPNext v17 install on PostgreSQL in `spike/` (Python 3.14 venv `spike/v314`, schema `frappe_spike`, site `spike/sites/spike.local`, shim `spike/shim.py`). Use it only to compare results (e.g. `spike/t5.py` prints rounding values). Run scripts from `spike/sites`:
  `PGOPTIONS="-c search_path=frappe_spike" PYTHONPATH="D:\Clients\BBS-ERP\vendor\frappe;D:\Clients\BBS-ERP\vendor\erpnext;D:\Clients\BBS-ERP\spike" ../v314/Scripts/python.exe ../<script>.py`
  Never import the oracle into the app.
- Vendored sources (read-only): `vendor/erpnext/erpnext`, `vendor/frappe/frappe`.

## Current state (verified 2026-10-03 10:20)

Exists and passing (`manage.py test` runs 37 tests OK in an isolated database):
- `apps/frappe`: `runtime.py` (frappe facade, db, session, cache stubs), `model/document.py` (about 450 lines), `model/naming.py` (42 lines, placeholder), `permissions.py` (about 190 lines), `utils/data.py` (about 310 lines, partial), `utils/nestedset.py` (48 lines, placeholder), `exceptions.py` (ported hierarchy), `models.py` (Series, Singles, Role, Has Role, DocPerm, User Permission), tests.
- `apps/erpnext`: generator command `generate_doctypes` (16 pilot doctypes generated: Fiscal Year, Fiscal Year Company, Currency, UOM, UOM Conversion Factor, Item Group, Cost Center, Branch, Department, Designation, Terms and Conditions, Holiday List, Territory, Customer Group, Supplier Group, Sales Person), generated models, registry, REST views (`/api/erpnext/...`), `doc_api.py`, only the **Fiscal Year controller ported**; the other 15 controllers are 5-line stubs.
- Verified against the oracle: Banker's Rounding default, 15 values (`flt`, `rounded`).

## Open defects, in the order you must fix them

Defect numbers refer to the Block 1 review (comment 1). Do not reorder.

### 0. Blocking bug: JWT requests are denied (fix first)
`CurrentUserMiddleware` (`apps/core/middleware.py`) sets `frappe.session.user` from `request.user` before DRF authenticates, so for JWT requests the user is `None`. Reproduction: superuser, `POST /api/auth/token/`, then `POST /api/erpnext/doc/` with `Authorization: Bearer <access>` and `{"doctype":"Branch","branch":"X"}` returns **403 "Not permitted to create Branch"**. Existing tests use `force_login` (session auth), which hides it.
Fix: set and always reset `frappe.session.user` **after** DRF authentication (a DRF authentication wrapper or a context manager around every `/api/erpnext/` view, reset in `finally`; use `contextvars`). Add tests that authenticate with a real JWT for create, update, submit, cancel, detail, list and meta; for a user with the role, without it, and with an invalid/expired token (401); plus a test that two sequential requests as different users never leak `session.user`. 401 for missing/invalid credentials, 403 only for authenticated users without permission.

### 1. Document lifecycle (defect 5)
Port `vendor/frappe/frappe/model/document.py` and `base_document.py` method by method into `apps/frappe/model/`. Required exact order for `insert`: `check permission`, `set_user_and_timestamp`, `set_docstatus`, `check_if_latest`, `before_insert`, `set_new_name`, `set_parent_in_children`, `validate_higher_perm_levels`, then `before_validate`, `validate`, `before_save`, mandatory/select/link/unique/etc validation (`_validate`, children with "Row #n" messages), `db_insert`, `after_insert`, `on_update`, `on_change`. `save` and `submit` follow Frappe's `run_before_save_methods`/`run_post_save_methods`. Specifically wrong today:
- `insert` validates before `before_insert` and before naming (controllers using `self.name` in `validate` break).
- `submit` skips `validate`; `cancel` must follow `check_docstatus_transition` exactly (no draft cancel) and run linked-document checks.
- Bare `raise Exception(...)` everywhere: use Frappe's classes and messages (`DocstatusTransitionError`, `ValidationError`, `MandatoryError`, `LinkValidationError`, `TimestampMismatchError`, ...).
- Remove silent `except Exception: return` (meta loading in default-value setup).
- Still missing: modified-timestamp conflict check, `amended_from` and amend naming, `non_negative`, `min/max_value`, `fetch_if_empty`, precision rounding of floats/currency on save, `get_doc_before_save`/`has_value_changed` semantics, `copy_doc`, `reload`, `Table MultiSelect`, child `idx` renumbering and per-row docstatus, linked-document protection (`delete_doc.py`, `linked_with.py`).
Tests: each rule above, ported from upstream tests where they exist (`vendor/frappe/frappe/tests/test_document.py`, `test_naming.py`).

### 2. Naming (defect 7)
Port `vendor/frappe/frappe/model/naming.py`: `parse_naming_series`, `make_autoname`, `set_name_by_naming_series`, `getseries`, `set_name_from_naming_options`, `validate_name`, `append_number_if_name_exists`, `revert_series_if_last`, `.YYYY.`/`.MM.`/`.DD.`/`.#####`/`.abbr.`/`{field}` tokens, `naming_series`, `field:`, `format:`, `hash` (Frappe's hash), `Prompt`, `autoincrement`, per-company series. Concurrency test: two threads creating names from one series never collide. Per-year series reset test.

### 3. NestedSet (defect 8)
Port `vendor/frappe/frappe/utils/nestedset.py` (`NestedSet`, `update_nsm`, `update_add_node`, `update_move_node`, `validate_loop`, `remove_subtree`, `rebuild_tree`, `get_ancestors_of`, `get_descendants_of`, `get_root_of`, `is_group`/`old_parent` rules). Replace the current full-table rebuild on every save. Property test: 200 random add/move/delete operations, then assert `lft/rgt` consistency and ancestor/descendant queries.

### 4. Utilities (defect 2)
Complete `apps/frappe/utils/data.py` from upstream (`money_in_words`, `fmt_money`, `get_first_day`, `get_last_day`, `get_quarter_start`, `get_year_ending`, `formatdate`, `get_time`, number formats, `flt` locale handling, everything else the pilot controllers and the next blocks use). Port the upstream tests (`vendor/frappe/frappe/tests/test_utils.py`, `test_data.py`). Commit oracle fixtures under `apps/frappe/tests/oracle/` (precision 0 to 9, negatives, large values, all three rounding methods) generated with the oracle, and assert against them.

### 5. Remaining pilot controllers (defect 1)
Port the **whole** `.py` of each, plus its upstream `test_*.py`: Item Group (NestedSet), Cost Center, Currency, UOM (+ UOM Conversion Factor), Holiday List (+ child `Holiday`, `get_events`, weekly-off helpers), Branch, Department (NestedSet), Designation, Terms and Conditions, Territory, Customer Group, Supplier Group, Sales Person. Sources are in `vendor/erpnext/erpnext/<module>/doctype/<name>/` (Currency is in `vendor/frappe/frappe/geo/doctype/currency/`). Generate any missing child doctypes with `generate_doctypes` first. Every vendor method ported or listed as skipped with a reason in the ledger.

### 6. REST contract (defect 9) and core doctypes (defect 11)
REST under `/api/erpnext/` per section 5.5 of the brief: list with Frappe filter syntax (`filters`, `or_filters`, `fields`, `order_by`, `group_by`, `limit_start`, `limit_page_length`, `pluck`), DELETE, rename, link search, `get_value`/`set_value`, whitelisted method calls with Frappe's `{message: ...}` envelope and `exc_type`/`_server_messages` errors, tree endpoints (`get_children`, `add_node`), `get_doc_permissions`, `docinfo`/`onload`. Generate the Frappe core doctypes from `vendor/frappe/frappe/core/doctype` and others (Workflow and related, Custom Field, Property Setter, Version, Number Card, Dashboard, Dashboard Chart, Report, Print Format, Letter Head, Notification, Country, Language, Module Def, Defaults, Prepared Report, Error Log, Scheduled Job Type), reusing existing `apps/core` models (Comment, ToDo, DocShare, Contact, Address, File, Email Account) where they exist.

### 7. Smaller items still open from earlier reviews
- Permissions: apply `get_permitted_fields` consistently; DocShare write/share semantics; hierarchical User Permissions; keep `Administrator`-only bypass; no auto "Sales User" grant beyond the explicit CRM staff mapping already in place.
- `frappe.db.rollback(save_point=...)` exists; keep it faithful.
- Clean the stray PowerShell escape (`` `r`n``) in `docs/ERP_PORT_BLOCK1_REPORT.md`.

## Process

- Work in the order above. After each numbered item run the verification list from the brief (section 9): `manage.py check`, `makemigrations --check --dry-run` (must be "No changes detected"), `manage.py test` (all pass, in the isolated DB), `generate_doctypes pilot` twice (no diff), smoke `GET /api/crm/session/boot/` = 200.
- Keep `docs/ERP_PORT_STATUS.md` current after every item (one row per file/doctype with honest status) and `docs/ERP_PORT_BLOCK1_REPORT.md` current with a per-defect-number table (fixed / partly / not started), exact commands and their output.
- Migrations must be generated (`makemigrations`), not hand-written, unless you state why.
- Commit nothing; the owner will review the working tree.

## When to stop
Stop when items 0 to 7 are done and verified, then write the final Block 1 report. Do not start Block 2. If you hit a blocker you cannot resolve, record it in the report with evidence and continue with the next item.

## One system rule (applies to every agent and every change)

BBS-ERP is one system, not a set of separate ones. Every doctype has exactly one table and one model, every function has exactly one implementation, and every module reads and writes the same records through the same document engine (`apps/frappe`) and registry (`apps/erpnext/registry.py`).
- Before adding a doctype, model, helper or API, search the tree for an existing one (`apps/core`, `apps/crm`, `apps/frappe`, `apps/erpnext`, `apps/hrms`). Reuse it. Never create a second table or a parallel implementation for something that already exists, and never copy a function into another module; import the single source.
- The ERPNext/Frappe doctype is the canonical record. Legacy models in `apps/core` and `apps/crm` that duplicate an ERPNext doctype (Address, Contact, Comment, ToDo, File, Email Account, Email Template, Data Import, Assignment Rule, Currency) are being merged into the canonical tables; do not add new code against the legacy copies, and do not edit them except as part of that merge (Claude owns the merge).
- Cross-module behaviour must go through links and hooks exactly as upstream does (Customer links to Address/Contact, Lead/Opportunity to Customer, Employee to User, Timesheet to Sales Invoice, and so on), so a record created in one module is visible and usable in every other.
- Unifying storage must never change behaviour: existing API responses, permissions, validation and the existing tests keep passing unchanged. If a unification would change behaviour, stop and report it.
- Before finishing any task, run `makemigrations --check --dry-run` and the full suite, and confirm you introduced no duplicated table, model or function.
