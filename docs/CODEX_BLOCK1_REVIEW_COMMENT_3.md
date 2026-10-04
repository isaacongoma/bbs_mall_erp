Review round 3 of Block 1.

## Correction to my earlier review (my mistake)
I told you `flt(1.005, 2)` must be `1.01`. That was wrong. I checked the real ERPNext v17 oracle (`spike/`), whose System Settings `rounding_method` default is **"Banker's Rounding"**. Real results from the oracle:

| call | oracle | current port |
|---|---|---|
| `flt(2.675, 2)` | 2.68 | 2.68 |
| `flt(1.005, 2)` | **1.0** | 1.01 (wrong) |
| `flt(0.285, 2)` | **0.28** | 0.29 (wrong) |
| `flt(-2.675, 2)` | -2.68 | -2.68 |
| `flt(2.665, 2)` | **2.66** | 2.67 (wrong) |
| `flt(0.125, 2)` | **0.12** | 0.12 |
| `flt(0.135, 2)` | 0.14 | 0.14 |
| `rounded(0.5)` / `rounded(1.5)` / `rounded(2.5)` / `rounded(3.5)` / `rounded(-2.5)` | **0, 2, 2, 4, -2** | 1, 2, 3, 4, -3 (wrong) |
| `rounded(2.675, 2)` / `rounded(1.005, 2)` / `rounded(0.125, 2)` | 2.68, **1.0**, 0.12 | 2.68, 1.01, 0.13 (wrong) |

So the fix you made for "half-up" is not ERPNext's default behaviour. Replace it. Port `flt`, `rounded`, `precision`-handling and `round_half_up` from `vendor/frappe/frappe/utils/data.py` exactly, including the three methods selected by System Settings `rounding_method` ("Banker's Rounding", "Banker's Rounding (legacy)", "Commercial Rounding"), the Decimal arithmetic they use, and the default being Banker's Rounding. The oracle table above becomes a test (`apps/frappe/tests/test_data.py`); then port the upstream tests from `vendor/frappe/frappe/tests/test_utils.py`/`test_data.py` and make them pass. Generate more oracle numbers with `spike/t5.py` (run it from `spike/sites` as described in the brief) rather than assuming. Never assert an expected number you have not checked against the oracle or the upstream test files.

## What round 2 got right (verified: `manage.py test` ran 13 tests OK in an isolated database)
- Plain `manage.py test` discovers and runs the suite; the dev-database verifier was removed.
- `frappe.db.rollback(save_point=...)` now issues `ROLLBACK TO SAVEPOINT` and the upstream `auto_create_fiscal_year` call is restored.
- Exception hierarchy ported (`DuplicateEntryError` is now a subclass of `NameError`), `get_desk_link` returns an anchor, Fiscal Year has 5 tests (upstream has 3).
- The defect table in the report is honest.

## Still open and in the wrong priority
Round 2 asked for A (data utils) and B (permissions) first. You did the easy items and left B untouched:
1. **Permissions security hole is still there.** `has_permission` still ends with `return ptype == "read"` (any user can read any doctype), still hardcodes roles, and is still not enforced by the API. Do this before anything else. Default deny; full matrix (role, permlevel, read/write/create/delete/submit/cancel/amend, `if_owner`), User Permissions, Doc Share; enforce in list, detail, create, update, submit, cancel, delete and meta; tests where a user without the role gets 403, a user with the role passes, `if_owner` and permlevel behave, and an unauthenticated request is rejected.
2. `frappe.utils.data` is still 163 lines against about 3,000 upstream; `test_data.py` has 2 tests. Finish the full port as described above.
3. Document engine (304 lines vs about 4,500 upstream), naming (42 lines), NestedSet (48 lines), the other 14 pilot controllers (still 5-line stubs), the REST contract, and the Frappe core doctypes: all unchanged.

## Order for the next round (do not reorder)
1. Rounding and the full `frappe.utils.data` port with upstream tests and oracle-verified numbers.
2. Permissions security fix with the enforcement tests.
3. Document engine port; then naming; then NestedSet with the 200-operation consistency test.
4. Pilot controllers one by one (whole file plus its upstream tests): Item Group, Cost Center, Currency, UOM, Holiday List first because they exercise trees, children and naming.
5. REST contract and core doctypes.

Report per defect number again, with exact test commands and output. Do not start Block 2.
