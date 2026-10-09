# Gemini Implementation Log

## Baseline (2026-10-04)
- Python environment: Python 3.13.5 (`backend\.venv\Scripts\python.exe`)
- `manage.py check`: System check identified no issues (0 silenced).
- `makemigrations --check --dry-run`: No changes detected.
- Baseline test suite run:
  `$env:TEST_DATABASE_NAME = "test_bbs_erp_gemini"; cd backend; .\.venv\Scripts\python.exe manage.py test --noinput`
  Ran 306 tests. 303 passed. 3 failures/errors in `apps.erpnext.accounts.doctype.journal_entry.test_journal_entry_parity` (Claude's domain). All other tests passed.

## Projects Module (2026-10-04)
- Suites verified:
  - `apps.erpnext.projects.doctype.activity_cost.test_activity_cost` (3 passed)
  - `apps.erpnext.projects.doctype.project_template.test_project_template` (1 passed)
  - `apps.erpnext.projects.doctype.project_update.test_project_update` (1 passed)
  - `apps.erpnext.projects.doctype.task.test_task` (13 passed)
  - `apps.erpnext.projects.doctype.project.test_project` (19/22 passed in latest run; Sales Order / blanket order fixture fixes applied)
- Parity & infrastructure fixes:
  - `apps/frappe/utils/data.py`: Handled `None` numerator in `safe_div`.
  - `apps/frappe/runtime.py`: Added dict wrapping in `copy_doc`, positional argument support in `get_list`, and converted `Decimal` results to `float` in `db.sql`.
  - `apps/frappe/model/naming.py`: Fallback `doc.name = doc.email` for `User` doctype.
  - `apps/erpnext/core/doctype/user/user.py`: Added `autoname`, `before_insert`, `validate` ensuring `self.name = self.email` and `self.username = self.email[:150]`.
  - `apps/frappe/model/document.py`: Implemented `load_doc_before_save()`, reset `_doc_before_save` on `insert()`, fallback to field default in `_db_field_value` when non-null field value is `None`.
  - `apps/frappe/model/db_query.py`: Foreign key resolution and `alias_rename` for field collisions.
  - `apps/erpnext/registry.py`: Skipped non-doctype/list JSON files in `_meta_by_doctype`.
  - `apps/erpnext/stock/stock_ledger.py`: Ensured `flt()` cast on `wh_data.qty_after_transaction` in `validate_negative_stock`.
  - `apps/erpnext/tests/utils.py`: Added fixtures for Global Defaults, Holiday List, Fiscal Years (2024-2027), Warehouse, Customer Group (`_Test Customer Group`), Territory, Price List (`_Test Price List`, `Standard Selling`), and completed `make_sales_order` / `make_stock_entry`.
