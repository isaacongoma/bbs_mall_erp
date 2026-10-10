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
| apps/hrms/api/roster.py | `from hrms.telemetry import capture` and the two `capture(...)` calls in `create_shift_schedule_assignment` and `swap_shift` removed | Telemetry is excluded by the HRMS prompt; the calls only report usage |
| apps/hrms/setup_wizard.py | `get_setup_stages` returns `[]`; `capture_user_persona`, `persona_from_wizard_args`, `PERSONA_FIELDS` removed | The only wizard stage upstream sends persona answers to telemetry (excluded); the React app replaces the wizard |
| apps/hrms/tests/utils.py | `BootStrapTestData()` no longer runs at import; `HRMSTestSuite.setUpClass` runs it after `ensure_test_fixtures()`, which is also called after `make_company` | Django imports test modules before the test database exists; upstream relies on an installed site |
| apps/frappe/runtime.py | Doctype-valued hook lists and doctype-keyed hook maps skip doctypes that are not registered yet and record them in `SKIPPED_UNREGISTERED_HOOK_DOCTYPES` | HRMS hooks reference later-stage doctypes such as Expense Claim before those doctypes are ported; remove the skip for each doctype when its stage lands |
| apps/frappe/core/doctype/permission_type/permission_type.py | `get_doctype_ptype_map` catches `LookupError` if Permission Type model is not generated | Permission Type is not yet generated in apps/frappe; returning empty map preserves docshare access |


## Framework change requested by HRMS

| File | Change | Reason |
|---|---|---|
| apps/frappe/model/document.py, apps/frappe/model/meta.py | `get_field_currency` added exactly as upstream and exported from `frappe.model.meta` | `frappe.utils.formatters` (used by the Employee CTC report) imports it |
| apps/frappe/utils/dateutils.py | `get_from_date_from_timespan`, `get_period`, `get_period_beginning` added from upstream | Dashboard Chart imports them |
| apps/frappe/utils/formatters.py, apps/frappe/utils/password.py, apps/frappe/model/utils/rename_field.py | Ported by `import_loop.py` | HRMS post-install patches and reports import them; `cryptography` and `passlib` added to requirements/base.txt by the loop |
| apps/frappe/model/base_document.py, modules/import_file.py, model/utils/link_count.py, utils/dashboard.py | Ported by `import_loop.py` while resolving `frappe.utils.dashboard` for the HRMS dashboard chart sources | `base_document.py` is a second BaseDocument implementation that nothing uses; the four files should be removed once the Dashboard Chart module is ported or dropped (deletion was blocked in this session) |
| apps/frappe/models.py, migrations/0005_usersettings.py | `UserSettings` model on table `__UserSettings` | `frappe.model.utils.rename_field.update_user_settings` queries it; HRMS post-install patches call `rename_field` |
| apps/frappe/runtime.py `Database.sql` | Bare `tab<DocType>` names after `from`, `join`, `into`, `update`, `table` are double-quoted | PostgreSQL folds unquoted identifiers to lower case; upstream SQL such as `set_company_in_leave_ledger_entry` uses unquoted `tabEmployee`. A string literal that itself contains `update tabX` would also be rewritten |
| apps/frappe/runtime.py `msgprint` | Upstream signature (`msg`, `title`, `raise_exception`, `as_table`, `as_list`, `indicator`, `alert`, `primary_action`, `is_minimizable`, `wide`, `realtime`); `message=` still accepted | HRMS code calls `frappe.msgprint(msg=..., title=...)` |
| apps/frappe/model/document.py `db_insert`, `db_update` | `None` in Check, Int, Float, Currency and Percent fields is written as 0 / 0.0 | Upstream columns are `not null default 0`; `get_valid_dict` coerces. HRMS reads `max_leaves_allowed` and similar with comparisons |
| apps/frappe/model/document.py `insert` | `set_fetch_from_values(skip_submitted=False)` | A document inserted with docstatus 1 (test records, imports) must still fetch `fetch_from` fields as upstream does |

## Framework change requested by Kenya

| File | Change | Reason |
|---|---|---|
| apps/frappe/runtime.py `HOOK_APPS` | `apps.erpnext.regional.kenya.hooks` appended | Kenya doc_events (KRA PIN validation) register through the existing hook merge |
| apps/erpnext/install.py `install_base_fixtures` | One call to `apps.erpnext.regional.kenya.setup.setup` | Kenya custom fields, tax categories and withholding categories on fresh installs |
| apps/erpnext/api.py `method_call` | Permission class `MethodCallPermission`: unauthenticated callers allowed only when the resolved method is `@frappe.whitelist(allow_guest=True)`; `frappe.local.request_ip` set from `REMOTE_ADDR` | Daraja callbacks are unauthenticated; they are guarded by token and optional IP allow-list in `M-Pesa Settings` |
| apps/frappe/model/document.py | `Document.is_dummy_password` added as upstream | `Document.get_password` called it and it did not exist |
| apps/erpnext/migrations/0026_mpesa_transaction.py, apps/erpnext/generated_models.py | `MPesaTransaction` model | New table `tabM-Pesa Transaction` (hand-defined doctype, no vendor source) |
- apps/erpnext/tests/utils.py: BootStrapTestData skips records of test doctypes created at runtime (Rack, Shelf, Inv Site, Store) because custom DocType table creation is not supported

## Full-port sweep (2026-10-05)

| File | Change | Reason |
|---|---|---|
| apps/frappe/model/create_new.py `make_new_doc` | Builds the template from `Document.as_dict()` minus table fields instead of `get_valid_dict(sanitize=False)` | Our Document is not a BaseDocument; the result is the same dict of field defaults |
| apps/frappe/core/doctype/doctype/doctype.py `DocType` | Virtual document built from the JSON meta; `save` clears the meta cache; `insert` throws | DocTypes are app files here, not database rows; Service Level Agreement and `update_doctypes` call `get_doc("DocType", name).save()` |
| apps/frappe/core/doctype/user/user.py | Module-level functions only (`get_system_users`, `user_query`, `has_permission`, ...) | The User model lives in `apps.core`; the upstream controller class is not used |
| apps/erpnext/management/commands/generate_doctypes.py | Keyword fieldnames emitted as `locals()['from'] = ...` | Call Log `from` |
| config/settings/base.py `SILENCED_SYSTEM_CHECKS` | `models.E020` | Bank Transaction Rule Description Conditions has a field named `check`, which hides `Model.check()` on that one model |
| apps/erpnext/patches/v16_0 | Only the v16_0 patches are ported | Upstream tests import them; older patches only upgrade legacy sites |
| apps/frappe/website/*, apps/frappe/sessions.py | Ported but not served | Django serves the React app; web forms and portal pages are reached through the CRM public web form API |
| apps/core/doctype/web_form (CRM public forms, table `web_form`) and the Frappe `Web Form` doctype (table `tabWeb Form`, erpnext 0036) | Both exist | The CRM table is a separate public-form feature with its own schema; the Frappe doctype carries the standard Web Form records HRMS (exit interview questionnaire) and ERPNext (issues, tasks, addresses) link to. Merge decision pending |
| apps/hrms/regional/kenya (rates.py, payroll.py, utils.py, setup.py) | Kenya payroll through the upstream `apply_regional_deductions` regional override, registered in apps/hrms/hooks.py `regional_overrides["Kenya"]` | PAYE bands, personal/insurance relief, NSSF tiers by effective date, SHIF, housing levy, NITA. Components are created by `hrms.regional.kenya.setup.setup` when a Kenya company is created (run_regional_setup), not globally: India's company setup throws when any Salary Component lacks an account. Rates are in rates.py with effective dates and must be checked against current KRA / NSSF notices before payroll use |
| apps/erpnext/regional/report/kenya_vat_return, kenya_withholding_certificate | New Script Reports | VAT return by treatment (templates) and withholding certificate per supplier from Tax Withholding Entry |
| apps/frappe/model/create_new.py, apps/frappe/runtime.py `new_doc`, Document `_set_defaults` | `frappe.new_doc` builds the cached template of user/global/static defaults exactly as upstream; `Document.insert` applies it to new documents and new child rows | Link defaults such as Item `stock_uom` come from `frappe.defaults` |
| apps/frappe/utils/background_jobs.py `execute_job`, `get_redis_conn`, `get_jobs` | Kept as the Celery-based versions | Upstream runs on RQ/Redis workers; this system uses Celery with Django. `enqueue` runs inline in tests as upstream does when `frappe.in_test` is set |
| apps/frappe/model/document.py `load_from_db` | Reloads through `frappe.get_doc` | Rows come from Django models, not a raw SELECT; the loaded values and child tables are the same |
| apps/frappe/permissions.py | `has_permission`, `get_doc_permissions`, `get_role_permissions`, `has_user_permission`, `add/remove_user_permission`, `get_valid_perms`, `get_rights` and related are the upstream functions; `get_roles` and the user lookup stay ours | Users are `apps.core.User` (email identity); Administrator gets every role as upstream does |
| apps/frappe/model/document.py `_set_defaults`, `_validate`, `run_method`, insert/save order | Follow upstream exactly (links, naming, notifications, webhooks, versioning, global search, automation) | Parity with upstream tests |

## Frappe framework closure (2026-10-06)

| File | Change | Reason |
|---|---|---|
| apps/frappe/runtime.py `get_list`, `get_all` | Delegate to `apps.frappe.model.qb_query.DatabaseQuery(doctype).execute(...)` exactly as upstream | The ORM-based `run_query` shortcut did not apply upstream permission, user-permission, shared-document and field-validation rules |
| apps/frappe/utils/background_jobs.py | `get_queues`, `get_workers`, `get_queue_list`, `validate_queue`, `set_niceness`, `FrappeWorker*`, `start_worker*` ported; `enqueue` still dispatches to Celery; `kill_horse` falls back to SIGTERM where SIGKILL does not exist (Windows) | Queue introspection needs a real Redis; execution is Celery-based by design |
| apps/frappe/database/database.py | `savepoint`, `get_query_execution_timeout` and the `frappe.database.utils` names re-exported | Upstream test and controller imports |
| requirements/base.txt, dev.txt | ldap3, httpx, python-socketio, uvicorn, websockets, zxcvbn, sentry-sdk, psutil, rauth; dev: responses, gitpython. `rq` pinned to 2.6.1 | Upstream imports; 2.6.1 is the version upstream pins and is the one that exports `StopRequested` from `rq.worker` |
| apps/frappe/{installer,api,realtime,gettext,patches/__init__,www/*,printing/*,utils/{chromium,doctor,typst_emitter,sentry,redis_wrapper,redis_queue,connections,...}}.py | Ported as upstream | Closing the missing-file inventory |
| Not ported: apps/frappe/database/{mariadb,sqlite,postgres}, app.py, asgi.py, runner.py, commands/, bench_helper.py, parallel_test_runner.py, coverage.py | None | Database access is Django/PostgreSQL, HTTP is Django, tests run through manage.py test; the bench CLI, WSGI app and bench test runner have no counterpart |

## Session of 2026-10-07

| File | Change | Reason |
|---|---|---|
| apps/erpnext/views.py `frappe_user`, `with_frappe_session` | Django superusers act as the Frappe user `Administrator`; anonymous requests act as `Guest`; `frappe.local.request` is the Django request | One system: upstream permission code only recognises the Frappe user names |
| apps/frappe/runtime.py `Database.begin/commit/rollback` | Inside a Django test transaction `commit()` moves a savepoint and `rollback()` rolls back to it | Upstream tests call `frappe.db.commit()` and `rollback()` against a real transaction |
| apps/frappe/runtime.py `whitelist`, `is_whitelisted` | Upstream text (type-validated arguments, guest and xss sets) | The old wrapper skipped argument type coercion |
| apps/frappe/model/dynamic_doctype.py, core/doctype/doctype/doctype.py | DocTypes created at runtime become dynamic Django models with real tables, stored in tabDocType/tabDocField/tabDocPerm with custom=1 | Custom DocTypes and the upstream tests that create them |
| apps/frappe/utils/logger.py | Log files are written under the sites path | Upstream assumes the process runs inside `sites/` |
| apps/core/migration_utils.py | Data-copy migrations give extra NOT NULL columns a temporary default | Existing databases have columns the migration's historical model lacks |
| Ported files | The `from __future__ import annotations` the port script injected was removed from 440 files (kept in 43 whose annotations need it) | String annotations disabled argument type coercion on whitelisted methods |
| apps/erpnext/core/doctype/user/user.py | Re-exports the upstream User controller; the hand-written stub is gone | The stub named Guest/Administrator by email |
| Administrator, Guest | Rows exist with unusable passwords | Login is by the Django superuser, which maps to Administrator |

## 2026-10-08 SPA boot endpoints
- `frappe.sessions.get` and `frappe.desk.desktop.get_workspaces` are not whitelisted upstream (the desk page is server-rendered). The SPA has no server-rendered boot, so `apps/erpnext/api.py` lists them in `SPA_BOOT_METHODS` and calls them without the whitelist check. Resource list endpoint accepts comma-separated `fields`.
- Database.get_singles_dict accepts upstream `cast` keyword; the local implementation always casts.
- `frappe.local` state was a single shared dict (ContextVar default instance) so concurrent requests on the threaded server leaked session user and permission caches between requests; each context now gets its own state dict.
- `Document.__init__` keeps a client-supplied `__islocal` so `savedocs` can report `localname` and the client renames the new document after the first save.

## Workspace links to doctypes that are not installed
- `Workspace._prepare_item` / `get_links` (`backend/apps/frappe/desk/desktop.py`) skip a link whose DocType has no meta instead of letting `DoesNotExistError` empty the whole link-card list (upstream relies on every linked DocType existing; e.g. Selling links `Lead Source`, which this port ships as `CRM Lead Source`).
- `Meta.get_permlevel_access` treats a missing DocPerm `permlevel` as 0 (permission rows in the JSON fixtures omit it; upstream DocPerm defaults it to 0).
- `Document.as_dict` keeps the upstream private properties (`__onload`, `__islocal`, `_user_tags`, `_liked_by`, `__run_link_triggers`, `__unsaved`) unless `no_private_properties` is set.

## 2026-10-09 TIMs HSCode field `vat_`
Django rejects model field names ending in an underscore; the reference field `vat_` is omitted from TIMs HSCode until the generator supports attribute aliasing.

## 2026-10-09 HRMS sweep
- `apps/frappe/modules/__init__.py` `load_doctype_module` resolves the doctype's own app (`registry._doctype_app`) instead of always `erpnext`, so hrms doctypes load.
- `apps/erpnext/views.py` `with_frappe_session` gives the DRF request `host` and `url` attributes, which upstream reads from a Werkzeug request (`get_host_name_from_request`).
- `apps/frappe/runtime.py` `parse_json` returns `_dict` for dict payloads, as `frappe.utils.data.parse_json` does.
- `apps/hrms/hr/report/shift_attendance/shift_attendance.py` `get_attendance_with_checkins` groups by the joined columns it selects; PostgreSQL rejects the MariaDB-style partial GROUP BY.
- `Onboarding Step` gains `module_onboarding` (Link to Module Onboarding), present on the reference site and missing from the vendored doctype (migration 0050).
- `code_only_modules` hooks added for HR (heirs: the nine HR sidebars), Subcontracting, Maintenance, Regional, Utilities and ERPNext Integrations so shell resolution matches the reference site, which ships no sidebar for them.
- Employee Promotion and Employee Transfer client scripts are the upstream files with the Jinja include of `hrms/hr/employee_property_update.js` inlined and the doctype name written out (the include uses `cur_frm.doctype`).
- Leave Allocation `cur_frm.add_fetch` and Salary Structure `cur_frm.cscript.*` assignments run in `setup` of their form handlers because the scripts load once, not per form.
- Reference-only HR gaps not built: Daily Work Summary Replies report, Team Updates page, Kenya payroll script reports (P9A, P10, NSSF, SHIF, NHIF, HELB, Housing Levy, Bank Remittance, Payroll Register, Periodic Payroll Comparison, Bank Payroll Advice). Their code is not in the vendored sources.
- Leave Control Panel carries two `company` fields upstream (one in the quick filters section); the duplicate is not reproduced.
- Daily Work Summary Replies report, Team Updates page and the three Daily Work Summary doctype controllers come from frappe/hrms `version-15` (the vendored hrms no longer ships them, the reference site does). The vendor tree carries copies so `scripts/port_controller.py` can port them.
- The eleven Kenya payroll script reports (NSSF, NHIF, SHIF, Housing Levy, HELB, P10, P9A, Payroll Register, Bank Payroll Advice, Bank Remittance, Periodic Payroll Comparison) are the upstream files from `navariltd/navari_csf_ke` (branch `develop`), ported with the same comment/indent rules, under `apps/erpnext/csf_ke/report`. `CSF KE`, `eTims` and `Kenya Compliance Via Slade` are listed in `apps/erpnext/modules.txt` so module paths resolve. The remaining csf_ke reports (sales, purchase, stock, withholding, budget) are available from the same repo and belong to their own module passes.
- `apps/hrms/hr/doctype/**` was regenerated on 2026-10-09 from the vendored hrms (`generate_doctypes` per doctype, `port_stubs.py`, `port_tests.py hrms`, plus helper modules and client files) after the folder was deleted by mistake. Anything hand-edited there earlier and not recorded in this file is lost; check against the reference when a doctype misbehaves.
- Job Applicant stays under Recruitment; the reference moves it to the CSF KE module because the Kenya app overrides the doctype.

## 2026-10-10 Property Management (new app, no upstream)
- `backend/apps/bbs_property` (module "Property Management") is a BBS Mall addition; ERPNext, HRMS and Frappe have no property-management app, so nothing in it is ported text. Doctype JSON is generated from `backend/scripts/property/` (`build.py`, `build_artifacts.py`), controllers, reports, portal API and M-Pesa code are hand written.
- The app is registered in the same places as hrms (`INSTALLED_APPS`, `HOOK_APPS`, registry, `METHOD_PREFIXES`, `sync_artifacts`, alias importer, `installed_apps` global set by `setup.after_install` / `manage.py setup_property`).
- Custom fields added to Sales Invoice (`is_lease_invoice`, `lease`, `property`, `billing_period_start/end`, `late_fee_for`, `late_fee_period`) and Customer (`is_tenant`, `tenant_portal_users`).
- Doctype-level client extensions for Customer and Sales Invoice load after the doctype's own scripts through `registerDoctypeExtensions` (`shared/frappe/scriptLoader.ts`); the HRMS add-on scripts (Employee, Company, Journal Entry, Payment Entry, Timesheet, ...) moved from `hrms.bundle.ts` to the same mechanism so their handlers no longer run before ERPNext's.
- Tenant portal is a React module (`frontend/src/modules/tenant`, routes `/tenant/*`, route meta `bare`) backed by whitelisted methods in `property_management/portal.py`. Portal users are ordinary `User` records with the `Tenant` role, linked to a Customer through the `Tenant Portal User` child table; every portal method re-checks that link and the user's access level (Owner, Finance, Operations).
- M-Pesa: STK push and C2B callbacks are served by `apps/bbs_property/views.py` at `/api/property-mgmt/mpesa/<token>/<kind>/`, protected by the generated callback token in Property Settings.
- Desk URLs now follow the reference site: `/desk/<module>/<doctype-slug>/<name>` with `new-<slug>-<random>` for unsaved documents (`core/navigation/canonicalPath.ts`, `app/components/DeskSwitch.tsx`); `/app/...` links redirect. Boot gained `doctype_names` for slug-to-doctype resolution.
- Existing scaffolds `apps/property` and `apps/leasing` (plain Django models, no UI) are left untouched and unused.
- `Database.savepoint`, `release_savepoint` and `rollback(save_point=...)` (`backend/apps/frappe/runtime.py`) do nothing outside an atomic block; PostgreSQL rejects SAVEPOINT in autocommit and that returned 500 from `get_open_count` on form dashboards.
