# Deliberate deviations from upstream ERPNext

Every change made to a mechanically ported file (apps/erpnext, apps/frappe) that is not a pure format conversion is listed here.

| File | Change | Reason |
|---|---|---|
| apps/erpnext/setup/doctype/company/company.py | `on_trash` no longer deletes BOM, BOM Operation, BOM Item, BOM Secondary Item, BOM Explosion Item | Manufacturing is out of scope; the doctypes are not ported |
| apps/frappe/hooks.py | `doc_events` emptied | Framework handlers (workflow actions, assignment rules, perm log, file attach, notifications, search index) are not ported; re-add each one with its implementation |
| apps/frappe/utils/background_jobs.py, scheduler.py | Re-implemented on Celery | Frappe's RQ based job layer is not used |
| apps/frappe/desk/reportview.py | Only `build_match_conditions` | Frappe desk report view is not ported |
| apps/frappe/desk/doctype/global_search_settings | `update_global_search_doctypes` is a no-op | Global search will be implemented on PostgreSQL full text search |
| apps/frappe/utils/global_search.py | no-op functions | same |
| apps/frappe/app_state.py | disabled-app filtering always off | Single app deployment |
| apps/frappe/modules/utils.py | `export_module_json` returns None | Developer mode export of standard documents is not supported |
| apps/frappe/desk/page/setup_wizard/setup_wizard.py | `make_records` only | Setup wizard UI is replaced by the React app |
- apps/frappe/core/doctype/role/role.py: website path validation and permission-manager based replicate_role replaced (website is not ported)
| apps/frappe/desk/form/assign_to.py | all functions are no-ops | Assignment (ToDo) is not ported yet |
| apps/erpnext/stock/doctype/item/item_search.py, apps/frappe/search/sqlite_search.py | queue_item is a no-op, SQLiteSearch is a stub | Item search index will move to PostgreSQL full text search |
| apps/frappe/utils/safe_exec.py | Trimmed to safe_eval and its helpers (server scripts, request helpers and render globals are not ported) | Server scripts are out of scope; safe_eval is needed for tax and report formulas |
| apps/frappe/core/doctype/module_def/module_def.py | Developer-mode folder management, workspace creation and sidebar cleanup removed | Desk workspaces and developer mode are not ported |
| apps/erpnext/controllers/accounts_controller.py cancel_system_generated_credit_debit_notes | Filters Journal Entry through its Journal Entry Account rows | The upstream query filters Journal Entry on reference_type/reference_name, fields that Journal Entry does not have in the vendored version |
| apps/hrms/hooks.py | Telemetry paths kept as unresolved hook handlers, but telemetry module itself is not ported | HRMS prompt explicitly excludes `telemetry.py`; keeping the hook names documents upstream surface without importing excluded code |
| apps/hrms/hr/doctype/hr_settings/hr_settings.py | Missing `erpnext.utilities.naming.set_by_naming_series` is tolerated | Stage 1 should remain importable while Claude continues ERPNext utility work in parallel |
| apps/hrms/hr/doctype/leave_type/leave_type.py | `clear_cache` resolves payroll `LEAVE_TYPE_MAP` lazily | Payroll is a later HRMS stage; eager import would break Stage 1 imports |
| apps/hrms/migrations/0001_initial.py | Migration was written manually from generated models | `.venv\Scripts\python.exe` became inaccessible after the pre-change full-suite run, so `makemigrations hrms` could not run |
