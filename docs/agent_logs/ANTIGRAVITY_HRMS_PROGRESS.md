# Antigravity HRMS Progress

## 2026-10-04 Step A Carry-overs & Stage 2 Preparation

### Done:
1. **HRMS Setup & After-Install Execution:**
   - Diagnosed and fixed database transaction issues in `apps/hrms/setup.py` and `apps/frappe/desk/page/setup_wizard/setup_wizard.py`.
   - Fixed `apps/frappe/core/doctype/user_type/user_type.py:update_users` to safely handle `User` queries when `user_type` column is absent (Gemini's User gap).
   - Fixed `apps/frappe/model/utils/rename_field.py` and `apps/frappe/model/utils/user_settings.py` to check `connection.introspection.table_names()` before executing queries against `__UserSettings`.
   - Fixed boolean expressions on numeric columns in PostgreSQL for `apps/hrms/patches/post_install/update_employee_advance_status.py` (`return_amount > 0`, `claimed_amount > 0`).
   - Verified that `hrms.setup.after_install()` now runs completely to the end without errors, printing `Thank you for installing Frappe HR!`.
   - Reverted temporary debug code from `apps/hrms/install.py`.

2. **Stage 1 Controller Verifications & Deviation Cleanups:**
   - Verified `apps/hrms/hr/doctype/hr_settings/hr_settings.py` calls `erpnext.utilities.naming.set_by_naming_series` directly with no fallback stubs.
   - Verified `apps/hrms/hr/doctype/leave_type/leave_type.py` cleanly imports `LEAVE_TYPE_MAP` from `hrms.payroll.doctype.salary_slip.salary_slip` (real 2,832-line controller ported).
   - Removed stale Stage 1 deviation entries for `hr_settings` and `leave_type` in `docs/ERP_PORT_DEVIATIONS.md`.
   - Confirmed `apps/hrms/hr/doctype/holiday_list_assignment/holiday_list_assignment.py` and `apps/hrms/hr/doctype/shift_type/shift_type.py` are the full upstream controllers.

3. **Test Infrastructure & Bootstrap Fixes:**
   - In `apps/hrms/tests/utils.py`:
     - Ensured submittable documents with `docstatus=1` are inserted as draft and then submitted (`doc.submit()`), enabling `Leave Allocation` to create its required `Leave Ledger Entry` rows.
     - Added mandatory `company: "_Test Company"` to bootstrap `Leave Allocation` fixtures.

### Verified:
- `.\.venv\Scripts\python.exe manage.py check`: 0 issues identified.
- `.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run`: No changes detected.
- `apps.hrms.tests.test_stage1_setup`: 6 tests passing, OK (with full `after_install()` fixture and patch completion).

### Current Blocker / Immediate Next Step:
- In `apps/hrms/hr/utils.py:share_doc_with_approver`, line 757: `frappe.has_permission(doc=doc, ptype="submit", user=user)` expects `doctype` as an optional keyword or positional argument. `apps/frappe/permissions.py:has_permission` needs `doctype=None` parameter fallback (`doctype = doctype or (doc.doctype if doc else None)`). Once patched, `test_holiday_list_assignment` and `test_shift_type` will execute.
