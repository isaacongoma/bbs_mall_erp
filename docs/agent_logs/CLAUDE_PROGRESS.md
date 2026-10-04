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
