# ERP Port Status

Updated: 2026-10-03 (after `delete_doc`: plain `manage.py test` found 140 tests, OK. Rows this step did not re-audit stay as previously written. `rename_doc` is still not started.)

## Counts

| Status | Count |
|---|---:|
| generated | 21 |
| controller ported | 1 |
| ported | 1 |
| tested | 8 |
| oracle-verified | 0 |
| not started | 6 |

Counts are the status column of the table below. `naming.py` is `ported`. `delete_doc.py` moved from `not started` to `tested`.

## Block 1 Framework Foundation

| Source path | Target path | Status | Notes |
|---|---|---|---|
| vendor/frappe/frappe/model/document.py | backend/apps/frappe/model/document.py | tested | Lifecycle covered by `apps.frappe.tests.test_document` and `apps.frappe.tests.test_delete_doc`. `Document.delete` calls `delete_doc` and accepts `ignore_on_trash`. Cancel link checks call the ported link functions from `run_before_save_methods`, before `db_update`, so a blocked cancel does not persist docstatus 2. Child-table docstatus on cancel is implemented in `set_parent_in_children` and is not covered by a child-row test. |
| vendor/frappe/frappe/model/naming.py | backend/apps/frappe/model/naming.py | ported | Supports field, hash, format, naming series, and series-like tokens with full thread-safe counter handling via Series model. |
| vendor/frappe/frappe/utils/data.py | backend/apps/frappe/utils/data.py | tested | Partly ported. Default rounding now comes from `System Settings` and matches ERPNext oracle Banker's Rounding values from review 3. Covered: `flt` parsing, commercial/banker's rounding examples, `rounded`, `cint`, `cast`, `comma_and`, and basic `evaluate_filters`. Full upstream module/tests still not complete. |
| vendor/frappe/frappe/utils/nestedset.py | backend/apps/frappe/utils/nestedset.py | tested | `NestedSet` subclasses `Document`. Territory tree tests, including `test_200_random_operations`, and `test_oracle_nestedset` passed in the 129-test run. `rename_doc` merge is not ported. |
| vendor/frappe/frappe/permissions.py | backend/apps/frappe/permissions.py | tested | Partly ported. Default-deny role matrix from JSON permissions is enforced by Document methods and ERPNext meta/list/detail/create/update/submit/cancel endpoints. Tests cover unauthenticated 401, 403 without role, pass with role, request-scoped `session.user`, `ignore_permissions`, DocShare read, permlevel 0 document grants, User Permission OR semantics, `applicable_for`, `is_default`, `ignore_user_permissions`, tree `hide_descendants`, and field masking across meta/list/detail. Full Frappe parity remains open. |
| vendor/frappe/frappe/database/postgres | backend/apps/frappe/runtime.py | generated | Initial `frappe.db` facade with SQL identifier normalization; full SQL compatibility remains open. |
| vendor/frappe/frappe/exceptions.py | backend/apps/frappe/exceptions.py | generated | Exception class hierarchy and HTTP status codes ported. API error shape is wired for ERPNext endpoints; full Frappe error logging/message behavior remains open. |
| vendor/frappe/frappe/core/doctype/role/role.json | backend/apps/frappe/models.py | generated | Native role storage table added. |
| vendor/frappe/frappe/core/doctype/has_role/has_role.json | backend/apps/frappe/models.py | generated | Native user-role child table added using email parent. |
| vendor/frappe/frappe/core/doctype/docperm/docperm.json | backend/apps/frappe/models.py | generated | DocPerm-equivalent storage added. |
| vendor/frappe/frappe/core/doctype/user_permission/user_permission.json | backend/apps/frappe/models.py | generated | User Permission storage added with `is_default` and `hide_descendants` columns. |
| vendor/erpnext/erpnext/accounts/doctype/fiscal_year/fiscal_year.py | backend/apps/erpnext/accounts/doctype/fiscal_year/fiscal_year.py | controller ported | Controller methods ported/adapted: `validate`, `on_update`, `on_trash`, `validate_dates`, `validate_overlap`, `auto_create_fiscal_year`, `get_from_and_to_date`. Isolated tests cover date length, overlap, company overlap and date lookup. |
| vendor/erpnext/erpnext/accounts/doctype/fiscal_year_company/fiscal_year_company.json | backend/apps/erpnext/accounts/doctype/fiscal_year_company | generated | JSON copied, generated child model created. |
| vendor/frappe/frappe/geo/doctype/currency/currency.json | backend/apps/erpnext/geo/doctype/currency | generated | JSON copied from Frappe source because ERPNext vendor does not own Currency. Migration `0003_seed_currencies` loads fraction data from `vendor/frappe/frappe/geo/country_info.json`. Controller is still the generated `Document` stub. `money_in_words` tests pass against those rows. |
| vendor/erpnext/erpnext/setup/doctype/uom/uom.json | backend/apps/erpnext/setup/doctype/uom | generated | JSON copied, generated model created. |
| vendor/erpnext/erpnext/setup/doctype/uom_conversion_factor/uom_conversion_factor.json | backend/apps/erpnext/setup/doctype/uom_conversion_factor | generated | JSON copied, generated child model created. |
| vendor/erpnext/erpnext/setup/doctype/item_group/item_group.json | backend/apps/erpnext/setup/doctype/item_group | generated | JSON and a partial controller exist. Existing tree tests pass. `validate_item_group_defaults` is still `pass`. Upstream merge, preset-record, and patch tests are not ported. |
| vendor/erpnext/erpnext/accounts/doctype/cost_center/cost_center.json | backend/apps/erpnext/accounts/doctype/cost_center | generated | JSON copied, generated tree model created. Controller not ported. |
| vendor/erpnext/erpnext/setup/doctype/branch/branch.json | backend/apps/erpnext/setup/doctype/branch | generated | JSON copied, generated model created. Controller not ported. |
| vendor/erpnext/erpnext/setup/doctype/department/department.json | backend/apps/erpnext/setup/doctype/department | generated | JSON copied, generated model created. |
| vendor/erpnext/erpnext/setup/doctype/designation/designation.json | backend/apps/erpnext/setup/doctype/designation | generated | JSON copied, generated model created. |
| vendor/erpnext/erpnext/setup/doctype/terms_and_conditions/terms_and_conditions.json | backend/apps/erpnext/setup/doctype/terms_and_conditions | generated | JSON copied, generated model created. |
| vendor/erpnext/erpnext/setup/doctype/holiday_list/holiday_list.json | backend/apps/erpnext/setup/doctype/holiday_list | generated | JSON copied, generated model created. Child Holiday rows are not part of the pilot list yet. |
| vendor/erpnext/erpnext/setup/doctype/territory/territory.json | backend/apps/erpnext/setup/doctype/territory | generated | JSON copied, generated tree model created. |
| vendor/erpnext/erpnext/setup/doctype/customer_group/customer_group.json | backend/apps/erpnext/setup/doctype/customer_group | generated | JSON copied, generated tree model created. `validate_currency_for_receivable_and_advance_account` now calls `get_cached_value` only when an account is set, matching upstream. The rest of the controller was not re-audited against the whole upstream file. |
| vendor/erpnext/erpnext/setup/doctype/supplier_group/supplier_group.json | backend/apps/erpnext/setup/doctype/supplier_group | generated | JSON copied, generated tree model created. |
| vendor/erpnext/erpnext/setup/doctype/sales_person/sales_person.json | backend/apps/erpnext/setup/doctype/sales_person | generated | JSON copied, generated tree model created. |
| vendor/frappe/frappe/model/mapper.py | backend/apps/frappe/model/mapper.py | not started | Required before transaction controllers. |
| vendor/frappe/frappe/model/workflow.py | backend/apps/frappe/model/workflow.py | not started | Required for workflow acceptance tests. |
| vendor/frappe/frappe/model/delete_doc.py | backend/apps/frappe/model/delete_doc.py | tested | `delete_doc`, static and dynamic link checks, `delete_dynamic_links`, child-row deletion, submitted-document refusal, `force`, `ignore_on_trash`, and the upstream link messages are covered by `apps.frappe.tests.test_delete_doc` (11 tests, inside the 140-test OK run). Not oracle-verified. Link maps are a registry JSON scan, not `tabDocField` SQL. Custom Field, Property Setter, and ungenerated reference doctypes are skipped. |
| vendor/frappe/frappe/model/rename_doc.py | backend/apps/frappe/model/rename_doc.py | not started | Rename support is not yet implemented in the ERPNext path. |
| vendor/erpnext/erpnext/hooks.py | backend/apps/erpnext/hooks.py | not started | Placeholder only; doc events and scheduler mapping remain open. |
| vendor/erpnext/erpnext/controllers/accounts_controller.py | backend/apps/erpnext/controllers/accounts_controller.py | not started | Block 2 dependency. |
| vendor/erpnext/erpnext/controllers/stock_controller.py | backend/apps/erpnext/controllers/stock_controller.py | not started | Block 5 dependency. |
| Block 1 acceptance tests | backend/apps/erpnext/tests; backend/apps/frappe/tests | tested | Plain `manage.py test` on 2026-10-03 ran 140 tests, OK, in an isolated PostgreSQL test database. |
| PostgreSQL isolated test database | project database role `bbs_erp` | tested | Owner granted database creation permission; isolated Django test database creation and destruction now works. |
| Dev database smoke command | backend/apps/erpnext/management/commands/verify_erpnext_foundation.py | tested | Removed. Verification now runs through isolated Django tests only. |

## HRMS Port

Updated: 2026-10-03. Baseline `manage.py check` and `makemigrations --check --dry-run` were clean before HRMS edits. Baseline `manage.py test --noinput` was not green before HRMS edits: it ran 223 tests, failed with 150 errors and 1 failure, and then could not drop `test_bbs_erp` because another database session was still connected. After that run, `.venv\Scripts\python.exe` and its configured base executable became inaccessible from PowerShell, so HRMS migrations/tests/checks could not be executed in this turn.

### HRMS Stage 1 Setup Masters

| Source path | Target path | Status | Notes |
|---|---|---|---|
| vendor/hrms/hrms/hooks.py | backend/apps/hrms/hooks.py | generated | Backend-only hook table copied/adapted for HRMS: override_doctype_class, doc_events, scheduler_events, accounting lists, dashboards, delete ignores. Unported handlers are tracked via `UNRESOLVED_HOOK_HANDLERS`. Telemetry hooks retained as unresolved paths; telemetry module itself is excluded by prompt. |
| vendor/hrms/hrms/install.py | backend/apps/hrms/install.py | generated | Minimal native wrapper calls `hrms.setup.after_install`; setup currently contains safe no-op placeholders until install records are ported. |
| vendor/hrms/hrms/hr/doctype/hr_settings/hr_settings.json | backend/apps/hrms/hr/doctype/hr_settings | controller ported | Single doctype metadata copied. Controller methods ported for naming-series setting and holiday-reminder frequency warning, with missing downstream naming utility tolerated until that ERPNext utility is present. |
| vendor/hrms/hrms/hr/doctype/employment_type/employment_type.json | backend/apps/hrms/hr/doctype/employment_type | generated | JSON copied, generated model and controller stub created. Upstream controller is pass-only. |
| vendor/hrms/hrms/hr/doctype/employee_grade/employee_grade.json | backend/apps/hrms/hr/doctype/employee_grade | generated | JSON copied, generated model and controller stub created. Upstream controller is pass-only. |
| vendor/hrms/hrms/hr/doctype/designation_skill/designation_skill.json | backend/apps/hrms/hr/doctype/designation_skill | generated | JSON copied, generated child model and controller stub created. Upstream controller is pass-only. |
| vendor/hrms/hrms/hr/doctype/leave_type/leave_type.json | backend/apps/hrms/hr/doctype/leave_type | controller ported | Validation methods ported for LWP allocation guard, mutually exclusive leave type flags, partial-pay fraction bounds, and earned-leave allocation warning. `clear_cache` records unresolved payroll dependency until Payroll stage. |
| vendor/hrms/hrms/hr/doctype/holiday_list_assignment/holiday_list_assignment.json | backend/apps/hrms/hr/doctype/holiday_list_assignment | generated | JSON copied and generated model created. Full controller is deferred because it imports Payroll `DuplicateAssignment` and depends on leave assignment flow. |
| vendor/hrms/hrms/hr/doctype/shift_type/shift_type.json | backend/apps/hrms/hr/doctype/shift_type | generated | JSON copied and generated model created. Full controller is deferred to Attendance/Shift stage because upstream imports Attendance, Employee Checkin and Shift Assignment. |
| vendor/hrms/hrms/hr/doctype/identification_document_type/identification_document_type.json | backend/apps/hrms/hr/doctype/identification_document_type | generated | JSON copied, generated model and controller stub created. Upstream controller is pass-only. |
| vendor/hrms/hrms/hr/doctype/interest/interest.json | backend/apps/hrms/hr/doctype/interest | generated | JSON copied, generated model and controller stub created. Upstream controller is pass-only. |
| HRMS Stage 1 migration | backend/apps/hrms/migrations/0001_initial.py | generated | Manual additive migration for the eight table-backed Stage 1 doctypes. `HR Settings` is `issingle`, so it uses `tabSingles`. Created manually because the Python executable became inaccessible after the pre-change baseline test run. |
| HRMS Stage 1 tests | backend/apps/hrms/tests/test_stage1_setup.py | generated | Tests added for meta/model registration, HR Settings single-doctype behavior, hook merge and Leave Type validations. Not run because Python executable was inaccessible. |

### HRMS Exclusions

| Source path | Target path | Status | Notes |
|---|---|---|---|
| vendor/hrms/hrms/www | n/a | not started | Excluded by HRMS prompt. |
| vendor/hrms/hrms/public | n/a | not started | Excluded by HRMS prompt. |
| vendor/hrms/hrms/frontend | n/a | not started | Excluded by HRMS prompt. |
| vendor/hrms/hrms/frappe-ui | n/a | not started | Excluded by HRMS prompt. |
| vendor/hrms/hrms/locale | n/a | not started | Excluded by HRMS prompt. |
| vendor/hrms/hrms/workspace_sidebar | n/a | not started | Excluded by HRMS prompt. |
| vendor/hrms/hrms/desktop_icon | n/a | not started | Excluded by HRMS prompt. |
| vendor/hrms/hrms/dock | n/a | not started | Excluded by HRMS prompt. |
| vendor/hrms/hrms/telemetry.py | n/a | not started | Excluded by HRMS prompt. Hook paths remain unresolved until telemetry is deliberately omitted or replaced. |
| vendor/hrms/hrms/subscription_utils.py | n/a | not started | Excluded by HRMS prompt. |
| vendor/hrms/hrms/uninstall.py | n/a | not started | Excluded by HRMS prompt. |
| vendor/hrms/hrms/regional/india | n/a | not started | Excluded by HRMS prompt; Kenya payroll will be implemented in HRMS regional style later. |
