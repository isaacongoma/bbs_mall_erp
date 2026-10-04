# Gemini: port the ERPNext projects, support, maintenance, quality and CRM modules (exact upstream code)

Written for: Gemini CLI, working in `D:\Clients\BBS-ERP`. Backend only (`backend/`). Do not touch `frontend/`.

Three agents share this tree. Stay inside your lane:
- Claude: ERPNext accounts, stock, selling, buying, assets, controllers, framework (`apps/frappe`). Do not edit these.
- Codex: HRMS (`apps/hrms`). Do not edit it.
- You: the ERPNext modules `projects`, `support`, `maintenance`, `quality_management`, `crm` (ERPNext side), `utilities`, `telephony`, `communication`, `portal`, `bulk_transaction`, `edi`.

Read first: `docs/CODEX_ERP_PORT_PROMPT.md` (architecture, rules, oracle), `docs/ERP_PORT_PLAN.md`, `docs/ERP_PORT_STATUS.md`, `docs/ERP_PORT_DEVIATIONS.md`, tail of `docs/agent_logs/CLAUDE_PROGRESS.md`. Your progress log: `docs/agent_logs/GEMINI_PROGRESS.md`.

## 1. The standard

This is an enterprise ERP. Port the real upstream source from `vendor/erpnext/erpnext/<module>` using the mechanical tooling in `backend/scripts/` (`port_controller.py`, `port_stubs.py`, `import_loop.py`, `port_closure.py`, `extract_functions.py`, `doc_method_loop.py`, `check_imports.py`). Same function names, signatures, control flow, queries, error messages and `_()` text. No stubs, no `pass` placeholders, no simplified logic, no try/except hiding a missing import, no invented helpers. If a framework function is missing, add it to our tree from `vendor/frappe` exactly (additive and small; log it in `docs/ERP_PORT_DEVIATIONS.md`; run the full suite before and after). Deviation only where the feature cannot exist in this architecture (desk UI, website, RQ), always logged with upstream file and reason.

Hard rules: no code comments or docstrings, no lint-disable directives, no git commits, additive migrations only, archive before deleting anything, no fabricated verification (say what you did not run).

## 2. Environment (do this first, exactly)

- Python: `backend\.venv\Scripts\python.exe`. If it fails with "Access is denied" / "did not find executable", stop and write the exact error and commands tried to your progress log. Do not continue by editing code you cannot run.
- Always use your own test database and `--noinput`: PowerShell `$env:TEST_DATABASE_NAME = "test_bbs_erp_gemini"; cd backend; .\.venv\Scripts\python.exe manage.py test --noinput <labels>`. Never use `test_bbs_erp` (other agents run at the same time). Never use `--keepdb`.
- Baseline before you change anything: `manage.py check`, `makemigrations --check --dry-run`, full suite. It was green at 294 non-HRMS tests; the HRMS app may add failures that are Codex's, note them but do not fix them.
- Run the full suite and `makemigrations --check --dry-run` after each module.

## 3. Work, in this order (finish and verify each before the next)

For each module: (a) generate doctypes (`manage.py generate_doctypes`, extend `auto_doctypes.json` via `add_doctypes.py`), (b) port every controller in the module with `port_stubs.py`/`import_loop.py` and the helper files (`utils.py`, `api.py`, whitelisted functions, scheduler functions, `doc_events` handlers from `erpnext/hooks.py` that belong to the module, dashboards `*_dashboard.py`, `report/*`), (c) port the upstream tests `test_*.py` next to the controllers and make them pass with only harness-level edits, (d) migrations via `makemigrations`, (e) update `docs/ERP_PORT_STATUS.md` rows and deviations.

1. `projects`: Project, Task, Timesheet (+ Detail), Activity Type, Activity Cost, Project Update, Project Template (+ Task), Project Type, Project User, Task Depends On, Projects Settings, and their reports. Timesheet links to Sales Invoice and Employee: port the exact upstream functions (`make_sales_invoice`, `get_projectwise_timesheet_data`, etc.) and test them against the existing Sales Invoice controller.
2. `support`: Issue, Issue Type/Priority, Service Level Agreement (+ Priority, Day, Fulfilled On Status, Pause SLA On Status), Warranty Claim, Support Settings, Support Search Source, plus SLA schedulers (`set_resolution_time`, `update_agreement_status`, `check_agreement_status`) registered on the Celery bridge from the hooks.
3. `maintenance`: Maintenance Schedule (+ Item, Detail), Maintenance Visit (+ Purpose), Maintenance Team Member, and their dashboards.
4. `quality_management`: Quality Goal, Quality Procedure, Quality Review, Quality Action, Quality Meeting, Quality Feedback and their children. (Quality Inspection stays with Claude's stock work; do not touch.)
5. `crm` (ERPNext side): Opportunity, Opportunity Type/Item/Lost Reason, Prospect (+ Lead, Opportunity), Campaign, Contract (+ Template, Fulfilment Checklist, Template Fulfilment Terms), Appointment, Appointment Booking Settings (+ Slots, Availability), Competitor, Market Segment, Sales Stage, CRM Note, CRM Settings, Email Campaign, Social Media Post, Lead helper code in `erpnext/crm/utils.py`. The Frappe CRM port (`apps/crm`) serves Lead/Deal; do not change its behaviour, only wire Opportunity creation from Lead to our existing CRM Lead model as the ported `make_opportunity` expects (compare with how `apps/crm` stores Lead and report any incompatibility instead of patching around it).
6. `utilities`, `telephony`, `communication`, `portal`, `bulk_transaction`, `edi`: port the doctypes and the functions other modules call (check `backend/scripts/check_imports.py` output for names that ported modules import and that are still missing, and port those first).

## 4. Behaviour tests

Beyond the upstream tests, for each module add at least one end-to-end test through the document lifecycle (insert, validate, submit/cancel where submittable, linked-document updates) asserting exact field values the upstream code computes (for example Timesheet billing amounts and costing rates, Issue SLA response/resolution dates with a Service Level Agreement and Holiday List, Maintenance Schedule generated visit dates, Opportunity status transitions). A test that cannot fail is not a test.

## 5. Reporting

After each module append to `docs/agent_logs/GEMINI_PROGRESS.md`: what was ported (file list), what was verified and the exact commands and counts, known gaps, decisions. Update `docs/ERP_PORT_STATUS.md` with honest statuses (`generated | controller ported | tested | oracle-verified`). If blocked, write exactly why and stop.
