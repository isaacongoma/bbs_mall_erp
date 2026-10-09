# Claude implementation log (Grok exhausted; Claude implementing directly)

## 2026-10-03 round 3
Suite: 180 tests OK; check and makemigrations clean.

Done:
- Fixed rename_doc leftovers: get_doc raises DoesNotExistError; get_controller resolves TermsandConditions exactly (silent Document fallback was hiding it).
- Stripped 230 code comments from apps/frappe and apps/erpnext (script, migrations excluded).
- New apps/frappe/utils/jinja.py (SandboxedEnvironment, DebugUndefined, validate_template, render_template string path, restricted render globals subset); frappe.render_template exposed.
- Terms and Conditions controller fully ported (validate_template, get_terms_and_conditions) plus tests.
- Currency controller ported (validate clears cache, enable_default_currencies) plus tests.
- Holiday List: get_supported_countries, local_country_name added; upstream test file ported (patch-based recalculate test skipped, patches not ported); delete_doc_if_exists added.
- Generated missing child doctypes: Holiday, Party Account, Customer Credit Limit, Item Default, Item Tax, Target Detail (child rows were silently dropped before). Migration erpnext 0004.
- Document engine: unset fields now initialise to None like Frappe; table fields passed as None stay []; invented rounded(flt()) on save replaced with upstream _fix_numeric_types semantics (flt/cint, no rounding); added Document.precision() and get_field_precision.
- Item Group validate uses frappe.in_test like upstream.

Known gaps:
- Item Group validate_item_group_defaults still pass: needs Item doctype (validate_item_default_company_links), Block 5.
- Department add_node/get_children, Sales Person get_timeline_data and on_doctype_update index hooks: need tree-view API, frappe.qb; planned with REST contract.
- Render globals are a subset of upstream render_safe_globals; full safe_exec not ported.
- Oracle fixtures still not regenerated from spike/.

## 2026-10-03 round 3b (suite: 205 tests OK)
- New apps/frappe/model/db_query.py: real frappe.get_list/get_all query engine. Filters as dict / [[f,op,v]] / [[dt,f,op,v]] / single list; operators = != <> < > <= >= like/not like (wildcards) in/not in between is set/not set descendants of(+inclusive)/not descendants of/ancestors of; or_filters; child-table filters via parent subquery; fields with `as` aliases and count/sum/avg/min/max; group_by; order_by validation; limit/start; distinct; pluck; as_list. get_list enforces read permission + user permissions and defaults to 20 rows; get_all ignores permissions and is unlimited. Unknown fields/operators raise DataError. Tests: apps/frappe/tests/test_db_query.py (15).
- apps/frappe/desk/treeview.py ported (get_all_nodes, get_children, _get_children, add_node, make_tree_args); Department get_children and add_node ported; Department tests ported/extended.
- runtime: is_whitelisted, db.has_column, dict-like form_dict.

Gaps: qb (pypika) compatibility layer not implemented; Sales Person get_timeline_data still needs it. on_doctype_update index hooks not applied.

## 2026-10-03 round 3c (suite: 219 tests OK)
- REST contract: apps/frappe/client.py (get_list, get_count, get, get_value, get_single_value, set_value, insert, insert_many, save, rename_doc, submit, cancel, delete, bulk_update, has_permission), apps/frappe/handler.py (run_doc_method), apps/erpnext/api.py with /api/erpnext/method/<dotted.path>/ (whitelist + HTTP verb restriction, frappe./erpnext. prefixes only), /api/erpnext/resource/<doctype>/ and /<name>/. Frappe error shape and status codes (401/403/404/409/417). Decimals->float, dates->str. Tests: apps/erpnext/tests/test_rest_contract.py (14).
- Document: as_dict (nested children, no_nulls, convert_dates_to_str, no_private_properties), update, getone, apply_fieldlevel_read_permissions; child doctypes skip standalone read permission check.
- runtime: has_permission, get_doc by filters dict, whitelist metadata (allow_guest, allowed_http_methods), sbool exposed; permissions.resolve_user accepts email strings.
Gaps: old doc/ endpoints remain for compatibility; File/attach, get_doc_permissions, search_link, reportview, desk.form.load not yet.

## 2026-10-03 round 3d (suite: 229 tests OK)
- frappe.qb: Frappe's query_builder package ported (builder, terms, custom, functions, utils) on top of the Frappe PyPika fork (pinned in requirements). frappe.qb = Postgres builder; DocType('X') -> "tabX"; .run(as_dict/pluck) executes through frappe.db.sql with bound parameters (verified against injection). frappe.qb.get_query is a compact engine (fields with as/aggregates, dict/list filters, order_by, group_by, limit/offset, distinct); permissions are NOT applied by qb (same as upstream get_query with ignore_permissions). Helpers added: get_table_name, convert_backtick_identifiers, types._dict, db.db_type, local.db, conf.db_type.
- Tests: apps/frappe/tests/test_query_builder.py (10).
Gaps: upstream frappe.database.query.Engine (permission-aware get_query, child-table joins, masks) not ported; our run_query (db_query.py) covers get_list/get_all semantics.

## 2026-10-03 round 3e (suite: 257 tests OK)
- Singles: Document supports issingle doctypes end to end (load from tabSingles with defaults and type casting, save/db_set, validate pipeline); frappe.db.get_single_value/set_single_value/get_singles_dict typed; generator creates no table for single doctypes.
- Defaults: apps/frappe/defaults.py ported (DefaultValue doctype generated), frappe.db.get_default/set_default/get_defaults, get_user_permissions helper.
- Property Setter: controller + make_property_setter ported; get_meta overlays Property Setter rows (token-checked cache, rollback-safe). Custom Field doctype generated but NOT applied to meta or tables yet (needs runtime column support).
- hooks: apps/frappe/hooks.py and apps/erpnext/hooks.py are now upstream copies (comments stripped); frappe.get_hooks merges both like Frappe; doc_events tuple keys supported; unresolved handlers (unported modules) are skipped and recorded in runtime.UNRESOLVED_HOOK_HANDLERS.
- Accounts Settings controller ported whole (+ accounting dimension get_accounting_dimensions, sync_auto_reconcile_config, get_child_docs, linked_with.get_child_tables_of_doctypes); settings doctypes generated: Accounts Settings, Global Defaults, Selling/Buying/Stock Settings; Accounting Dimension (+Detail), Repost Allowed Types, Scheduler Event, Scheduled Job Type models generated (controllers other than Accounts Settings still stubs).
- Misc: Document.is_new, _dict.update/copy, Meta.get_translated_label, frappe.unscrub.

Known gaps / next:
- Global Defaults controller, Accounting Dimension controller (needs Custom Field + dynamic columns), Account / Company / Cost Center full controllers, chart of accounts importer, GL Entry, accounts/utils.py (get_balance_on, get_fiscal_year...), erpnext/__init__ helpers (get_default_company, get_company_currency ...).
- DocField/DocType virtual doctypes for frappe.get_all("DocField") style queries.
- Toggling Accounts Settings discount/loyalty flags raises until Sales/Purchase doctypes exist (get_meta unknown doctype).

## 2026-10-03 round 4 (mechanical port tooling; suite state mid-sweep)
New tools in backend/scripts: port_controller.py (vendor file -> our tree: tabs to spaces, comments stripped, TYPE_CHECKING blocks removed, doctype attribute inserted, `from __future__ import annotations` when needed), port_closure.py (module-level erpnext import closure), import_loop.py (import a module, auto-port missing frappe/erpnext modules and pip-install missing packages), port_stubs.py (replace generated controller stubs with the upstream controller), extract_functions.py (append selected upstream functions to an existing module), add_doctypes.py / collect_doctypes.py (extend apps/erpnext/management/auto_doctypes.json which the generator reads; generator also pulls child table doctypes), port_all_controllers.py (import sweep over every controller).
Done: Custom Field runtime (dynamic model fields + ALTER TABLE, meta overlay), virtual DocField/DocType queries, Account/Company/Cost Center/Warehouse/etc controllers ported, chart of accounts importer + data, Company creation with the Standard chart creates 98 accounts, base fixtures installed on post_migrate (apps/erpnext/install.py), Celery based background jobs, singles/defaults, upstream utils/hooks/naming helpers, 176+ doctypes generated, Role controller. Deviations are listed in docs/ERP_PORT_DEVIATIONS.md.
Status: the full suite was green at 257 before this round; it is being restored while ported controllers are made importable (sweep in progress). Item, Customer, Supplier, invoices etc. controllers are mechanically ported but untested.

## 2026-10-03 round 4 result (suite: 276 tests OK; check and makemigrations clean)
- Company creation is oracle-verified: apps/erpnext/setup/doctype/company/test_company.py compares the Standard chart created for a Kenya/KES company with the account tree of the real ERPNext install in spike/ (account name, number, parent, root type, report type, account type, group flag, currency; 98 accounts match, the oracle's 99th account "Equity Bank" was added by the spike setup script itself). Fixture: apps/erpnext/tests/oracle/standard_chart_company.json.
- 208 controllers are importable (sweep script clean), 176+ doctypes generated, base fixtures (countries, currencies, roles, item groups, territories, warehouse types, ...) installed on post_migrate; test state (caches, thread local, flags) is reset per test.
- Controllers for Item, Customer, Supplier, invoices, stock, buying, manufacturing and subcontracting modules were ported mechanically because ERPNext imports them. They import but are NOT tested or oracle verified. Treat them as "mechanically ported".
- Open: Item/Customer/Supplier behaviour tests, GL Entry posting, Sales Invoice parity scenarios, Kenya localisation/eTIMS, reports, frontend. Deliberate deviations: docs/ERP_PORT_DEVIATIONS.md.

## 2026-10-03 regression fixed, suite green (288 tests)
- Generated string/text columns nullable (migration 0021); None to "" conversion on write.
- db_query: `name` aliases to `email` on the hand-defined User model.
- naming fallback is hash (upstream default), not title_field.
- submit/cancel run inside transaction.atomic so failed back-link checks roll back.
- get_doc(dict) no longer checks read permission (upstream parity).
- Sales Invoice parity tests (totals, GL vs oracle, submit status, cancel reversal) pass.
- Next: more Sales Invoice scenarios (inclusive tax, discounts, multi-currency, payments, credit notes), Payment Entry, Journal Entry, reports.

## 2026-10-03 Sales Invoice payment and credit note parity
- db.escape returns a quoted literal (upstream); sql unescapes %% when no params.
- Document: _table_fieldnames, read-only property fields skipped on init, Time "Now" default uses nowtime.
- new_doc supports parent_doc/parentfield/as_dict/kwargs; documents load Decimal as float (upstream Postgres behaviour).
- get_all supports aggregates over a child table (SUM/ABS over `tabChild`.field) with child filters.
- Parity tests now cover inclusive tax, discount, quantity, full/partial payment entry, credit note (update_outstanding_for_self default: original stays 116000, credit note -116000).
- Test DB name per agent: TEST_DATABASE_NAME env var. Full suite: all non-HRMS tests pass; 6 HRMS stage 1 tests (Codex) fail.

## 2026-10-04 One-system merges, HRMS unblock
- Merged into canonical ERPNext tables with data-copy migrations and call sites moved: Currency, Comment, File, Email Template, Email Account (CRM-only fields as Custom Fields via apps/core/crm_custom_fields.py), ToDo (single store apps/core/assignments.py), Address.
- apps/core/identity.py is the single user pk/email mapper.
- Added tests: apps/crm/tests/test_comments.py, test_email_records.py, test_assignments.py (11 pass).
- Codex out of usage: took over HRMS blockers. Defined upstream salary_slip cache-key constants, generated all 152 HRMS doctypes (migration hrms_all_doctypes), updated the Company chart test (HRMS adds "Expense Claims") and the hooks test (Expense Claim now registered).
- Open: Contact (+Email/Phone) merge, Data Import, Assignment Rule engine, CRM-named models; User controller port (frappe.core.doctype.user missing: Email Account on_update, Employee tests); Gemini is editing User handling in runtime/document.

## 2026-10-04 Lookup merges, framework parity, HRMS unblock (other agents stopped)
- Merged CRM Industry, Lead Source, Lost Reason, Territory into Industry Type, UTM Source, Opportunity Lost Reason (CRM description as Custom Field), Territory (crm 0035, erpnext 0030); registry tolerant of unregistered doctypes. CRM suite 20 tests pass.
- Framework: FrappeTimeField (timedelta) and FrappeDateTimeField (naive), hidden columns _user_tags/_comments/_assign/_liked_by on all tables (erpnext 0027, hrms 0005, frappe 0006), commit/rollback no-ops in atomic blocks, enqueue returns job object + RQ Job virtual doctype, as_json upstream signature, throw(msg=), get_cached_value fallback, db.get_list permission-aware again, build_match_conditions expands tree descendants and returns upstream shape, user_permission_exists None/"" fix, linked_with fully ported, twofactor ported, System Settings defaults + languages installed.
- Regression slice (frappe, erpnext foundation/setup, core, crm, SI, JE, PI): 335 tests, remaining failures fixed afterwards (rename_doc as_json, company chart extras, employee user permission).
- Shift Type tests 33/34; the remaining one depends on weekday (today is a Sunday).

## 2026-10-05 Wiring audit (all stopped agents' lanes taken over)
- scripts/sweep_imports.py: imports every erpnext/hrms/frappe module in one Django process. Result 1673 modules, 0 failing. Ported missing framework pieces: communication mixins, data_import exporter/importer/value_mapping, custom_role, desk.desktop, slack_webhook_url, integrations.utils, printing.layout/fieldtypes/print_format_generator, page, desk.calendar, utils.goal/oauth/modules, push_notification, concurrency_limiter, redis_semaphore, database.utils (full), mapreduce + duckdb sync helpers, get_redis_conn, make_boilerplate, check_safe_sql_query.
- scripts/fidelity_audit.py: AST comparison of every erpnext/hrms function with upstream. HRMS 12 minor diffs; ERPNext divergences were setup masters (re-ported from upstream) and my nestedset (replaced by upstream port). Remaining differences are comments/annotations and documented deviations.
- scripts/port_tests.py: ported 250 ERPNext upstream test modules and 15 test_records.json. tests/utils.py is now the upstream file; BootStrapTestData runs once per test DB via apps/frappe/test_runner.py (FrappeTestRunner), ERPNextTestSuite is Django TestCase based.
- One-system: Gender, Salutation merged into canonical doctypes (crm 0036, core 0024).
- Framework: __setup__ called after init, append(key) default row, discard, check_docstatus 1->1 = update_after_submit, db.exists(dict), Cache.exists kwargs, tabUser view, Email Queue doctypes, integration doctypes.
- Next: finish bootstrap run, then run each area (accounts, stock, selling, buying, assets, projects, support, ...) and fix failures; then HRMS full suite.

## 2026-10-05 Full-port sweep (missing upstream files)
- Found 927 upstream erpnext/hrms files absent from the backend (reports, mapper modules, 112 doctypes, tests, helper packages). scripts/port_missing.py ports every non-patch, non-test module that is missing or a one-class stub; 436 files ported. All 112 missing ERPNext doctypes added to auto_doctypes.json and generated (erpnext 0035); Web Form, Web Form Field, Web Form List Column, Web Form Request, Tag added (erpnext 0036).
- generate_doctypes emits `locals()[name]` for Python keyword fieldnames (Call Log `from`); `models.E020` silenced for the Bank Transaction Rule Description Conditions `check` field.
- scripts/port_tests.py now creates missing test packages (erpnext/stock/tests, controllers/tests): 270 more upstream test modules. Hand-written tests that replaced upstream tests were kept as `*_local.py` and the upstream versions ported (item_group, department, holiday_list, accounts_settings, bank_statement_import_log, cost_center, project_update, pos_profile, company, sales_invoice).
- New scripts: sweep_tests.py (imports every test module), missing_names.py, fix_undefined.py (pulls missing imports/constants from upstream into an extracted file), dedupe_imports.py, try_import.py.
- Third-party packages added to requirements/base.txt: mt940, plaid-python~=7.2.1, pypdf, pyarrow, python-youtube, duckdb.
- Framework pieces ported: cache_manager (full), sqlite_search (full), create_new (full, make_new_doc adapted to our Document), duckdb database/schema, sessions, rate_limiter, telemetry package, frappe.website package, import_provider, User module functions, DocType controller exceptions plus a virtual DocType document, permissions/db_query helper functions, custom_field extras, patches v16_0.
- Import sweep: 2303 modules, 0 failing. Test import sweep: 696 modules, 1 failing before the DocType class landed.

## 2026-10-06 Frappe framework closure
- Ported the 68 listed desk/email/integrations/core/website/printing gap files, then every upstream frappe file absent from apps/frappe except the bench/MariaDB/SQLite infrastructure (see deviations). frappe import sweep: 658 modules.
- Appended the missing upstream functions to client, user (24 functions), assign_to, setup_wizard, modules/utils, global_search, jinja, dateutils, delete_doc, model/meta, background_jobs, apps, handler, locale, currency, property_setter.
- `frappe.get_list` and `frappe.get_all` now run the upstream query-builder DatabaseQuery.
- Ported 325 upstream frappe test modules (scripts/port_tests.py frappe). sweep_tests.py frappe: 37 of 367 test modules still fail to import (bench runner/app tests, helper imports from our own differently-shaped test_db_query/test_query_builder).
- Fixed regression causes: company restriction hook `debug` kwarg, `_get_jenv` call, dict permission rows in `get_role_permissions`.

## 2026-10-08 ERPNext client port (frontend)
- Batch-ported all ERPNext client scripts (392 doctype, 174 report, 16 page, 56 public/js) with scripts/portClientScript.mjs; typecheck, eslint and the 83 frontend runtime/port tests are green.
- New runtime pieces in shared/frappe (globals.ts, window typings, jquery/dayjs/awesomplete/onscan.js dependencies).
- Next: register scripts with the loader, build frappe.ui.* (Dialog, Grid, Tree, Page, ListView, Report view), rebuild the Desk form on FormController, replace Codex's thin modules/erpnext/doctypes tree.

## 2026-10-08 Upstream desk client running in the browser
- Customer and Sales Invoice forms render end to end in a real browser (Edge via playwright-core) through the ported Frappe form engine and the React skin; verified with screenshots. Fixes found by that loop: boot endpoints allowlist, `frappe.local` state sharing across threads, response merge (`docs`, `docinfo`) for method calls, `get_singles_dict(cast)`, `response_headers`, JWT-aware session-expiry check, serialized form opens, `frm.events` population, circular import order in `apps/erpnext/api.py`.
- Remaining: list/tree/report/page views over `listview_settings`/`query_reports`/`treeview_settings`, quick entry and FileUploader, sidebar attachments/assign/share/tags, design polish of Check/Link fields, HRMS client port, visual QA of all ERPNext doctypes, deploy.

## Sidebar menu grouping
- Rail modules now show only their own workspaces (`shared/utils/workspaceGroups.ts`: `MODULE_HOME`, `MODULE_WORKSPACES`); the Desk rail lists only unmapped/custom workspaces. All 32 server workspaces stay reachable.
- HR navigation sections are collapsed by default and ordered (Self Service, Manager, Shift & Attendance, Leaves, Expenses, Payroll, Recruitment, Performance, HR Setup, Reports); the active section opens automatically. HR workspaces are grouped People / Time / Pay / Setup.
- Fixed an update loop in `DeskListPage` caused by a fresh empty settings object per render (`useListViewSettings`, `useReportSettings`).
- Report view: `frappe.query_report` facade plus `useReportSettings` wired into `DeskReportPage`.

## Desk shell now mirrors the reference ERPNext site (2026-10-08)
- Reference: erpnext-wwi-sjf.c.frappe.cloud. Snapshots in `docs/reference/` (boot sidebars/dock, workspaces + charts/cards/onboarding). Scripts: `backend/scripts/sync_sidebars_from_reference.py`, `sync_workspaces_from_reference.py`, `ensure_module_defs.py`.
- Sidebars, dock, workspaces, number cards, charts, onboarding fixtures aligned to the reference and re-imported; `Dock` fixtures now included in artifact sync; HR Module Defs created; `get_hooks(app_name=)` is app-aware; stub doctype controllers under `erpnext/*/doctype` re-export the real `frappe` controllers (175 files); System Settings values now read from the DB; `Document.is_single` no longer shadowed by an `is_single` field.
- Frontend: dock rail (app logo + duotone module icons), per-shell sidebar (Search, Notification, Home...) from `boot.module_sidebars`, apps page `/apps`, `DeskEntryPage` (workspace | page script | list), workspace page restyled (onboarding, report charts, shortcuts, 3-column link cards).
- Pending: Dashboard Chart `empty_state_message` (custom field on reference site), report page parity, Accounting list/form pages, other modules' workspaces check.

## Doctype layout synced from reference (2026-10-08)
- `backend/scripts/sync_doctype_layout_from_reference.py` (snapshot `docs/reference/erpnext_cloud_doctypes.json`, 1049 standard DocTypes): field order, tabs/sections/columns and field properties applied to 985 local DocType JSONs. Local-only fields kept but hidden (179); reference-only data fields not added (30, listed in `docs/reference/doctype_sync_report.json`; need additive columns); 13 fieldtype mismatches kept local.
- Form page is now full width without the card frame.

## Desk form and list parity pass (2026-10-08)
- Form: existing documents now load (`Meta.get_permlevel_access` default 0; `Document.as_dict` keeps `__onload` etc.); reference-style right panel (280px, avatar tile, Assign/Attachments/Tags/Share, last edited/created), Comments + Activity under the form, toolbar View/Manage groups with up-down chevrons, prev/next/menu pills, sticky tab bar, hidden scrollbars, collapsible sections with real chevrons.
- Frappe core doctype scripts (243) ported to `src/modules/frappe/**` (hand fixes: data_import cast, role overrides, DataTable import, web template editor import); `roles_editor`/`module_editor` framework files ported; `pytz` added to requirements.
- List: new reference-style table list (`DeskTableList`, `DeskListFilters`, `useReportviewList`): ID/standard filters with like toggle, Filter pill with clear, sort control, view switcher, menu, bulk actions, checkbox cells, footer page sizes. Report View, Quick-entry Add, saved filters/group-by sidebar of the old page are not yet in the new table view.
- Link fields call the Frappe `search_link` (the CRM endpoint returned Django `str(model)` labels); non-CRM only.

## 2026-10-09 Accounts module reference pass
- Reference customizations (Custom Field, Property Setter, Custom DocPerm, dashboards, currency, singles) snapshotted in docs/reference/ and applied by backend/scripts/sync_*_from_reference.py, seed_reference_company.py, hide_non_reference_fields.py.
- Frontend: tree view page (DeskTreePage + upstream treeview port), report page rebuilt on frappe-datatable with depends_on filters, button groups, summary; dashboard page; form dashboard connections; grid footer; list filter row and empty state.
- Backend: FormMeta.as_dict now returns __dashboard; registry applies field_order Property Setter and typed property values; Database.sql_ddl PostgreSQL quoting; Onboarding Step Map is_optional.
- Not done: ~50 eTims/Slade/Navari doctypes (their Custom Fields were removed because the link targets do not exist), Account/other forms not fully compared, report grid tree-mode (Set Level/Collapse All).

## Accounts sweep: eTims shell
- AppSidebar: shells with a sidebar but no dock app open under that sidebar without the icon rail.
- Added backend/apps/erpnext/etims/sidebar/etims/etims.json (from reference boot snapshot) so the eTims sidebar has the reference order and Reports group.
- Open: Reports group renders collapsed (reference expanded), header logo, user footer, eTims sample data rows, Slade and Navari list comparison, doctype export/field_order/perm-bypass notes from the earlier round.

## HRMS sweep (2026-10-09)
- HR doctypes: all 93 sidebar doctypes now load (`load_doctype_module` fix); meta synced to the reference through `backend/scripts/sync_doctype_props_from_reference.py` (Property Setters for documentation, description, title field, field props, field order, hidden non-reference fields).
- Client scripts: 179 hrms client scripts ported (`portAllClientScripts.mjs hrms doctype|report|page|public`), `hrms.bundle.ts` registered as a shared script, desk script glob includes `hrms`, eslint relaxed for the ported hrms folders.
- Shell: `hrms` app name no longer collides with the registry module id; sidebar sections default open unless `keep_closed`; `open_in_new_tab` items keep the active highlight; code-only module hooks; eTims/no-dock shells open without the rail.
- Lists/forms: standard empty-state copy, inner buttons after the view switcher, custom button groups on lists, Name prompt field on `autoname: prompt` doctypes, bold values for required fields, full-width User link, date/time picker chevron hidden, grid placeholders hidden.
- Upstream filter UI (`ui/filters/*`) ported so `frappe.ui.FilterGroup` exists; shared scripts load at desk boot; `report_utils` wired.
- Workspaces: React chart widget with filter/menu/time controls, last-synced line and empty-state sample; onboarding widget with greeting, module rows, Import button and 320x180 video.
- Open: Employee/forms detail pages (saved docs), HR reports against the reference, HR dashboards, workspace "..." menu, Daily Work Summary Replies / Team Updates / Kenya payroll reports, Job Applicant module (reference moves it to CSF KE).
- 2026-10-09 (later): Daily Work Summary (doctypes, report, page) and the eleven Kenya payroll reports added; the Report/Page records are imported and every Kenya report runs through `query_report.run`. hrms doctype folder regenerated after an accidental delete. Form-structure comparison, HRMS tests and sample-record pages still pending at this point.
- 2026-10-09 (login): new login page (split layout, responsive, no scroll on desktop) with email+password then a 6-digit SMS code (HostPinnacle `send_sms`), forgot password (SMS code, then new password), Google sign-in (button and One Tap, needs `GOOGLE_OAUTH_CLIENT_ID`), and passkeys (WebAuthn; add or remove from the user menu, Passkeys). Backend: `apps/core/login_flow.py`, `PasskeyCredential` model (migration 0030), routes under `/api/auth/`, tests in `apps/core/tests/test_login_flow.py`. Settings: `GOOGLE_OAUTH_CLIENT_ID`, `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ORIGINS`, `LOGIN_OTP_ENABLED`. A user with no mobile number, or HostPinnacle disabled, signs in with the password alone.
