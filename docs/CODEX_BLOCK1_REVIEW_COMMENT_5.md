Review round 5 of Block 1.

## Verified good
`manage.py test` runs 37 tests OK in the isolated database. Permission fixes from round 4 are in (permlevel 0 only grants document access, user-permission values OR'd, Administrator-only bypass, field masking). Document engine gained before-save snapshot, `set_only_once`, `allow_on_submit` validation, `fetch_from`, `db_set`, `doc_events` dispatch.

## Blocking bug found (production path is broken)
The frontend authenticates with **JWT Bearer tokens**, not Django sessions. `CurrentUserMiddleware` reads `request.user` before DRF has authenticated the request, so for a JWT request it is `AnonymousUser`, and the middleware sets `frappe.session.user = None`. The document engine then runs its own permission check with no user and denies everything.

Reproduction (I ran this against your code in an isolated test database, then deleted the probe):
1. create a superuser, 2. `POST /api/auth/token/` to get an access token, 3. `POST /api/erpnext/doc/` with `Authorization: Bearer <token>` and `{"doctype": "Branch", "branch": "JWT Probe"}`.
Result: **HTTP 403 "Not permitted to create Branch"** for a superuser. Every ERPNext write through the real login path will fail. All your tests pass only because they use `client.force_login`, which is session authentication and does not exercise the real path.

Fix:
- Set and reset `frappe.session.user` after DRF authentication, not in plain Django middleware. Options: a DRF authentication class wrapper (call the JWT authenticator, then set `session.user`), or decorate every `/api/erpnext/` view with a context manager that sets the user from `request.user` after authentication and always resets it in `finally`. Use `contextvars` (not `threading.local`) so async/thread reuse cannot leak a user.
- Add tests that authenticate **with a real JWT** (`/api/auth/token/` then `Authorization: Bearer`) for create, update, submit, cancel, detail, list and meta, for a user with the role, a user without it, and an expired/invalid token (401). Keep one session-auth test too.
- Add a test that two sequential requests as different users never see each other's `session.user`.
- Make the permission failures show up as 401 for missing/invalid credentials and 403 only for authenticated users without permission.

## Document lifecycle is still in the wrong order
`insert()` still runs `before_validate`/`validate`/`validate_fields` **before** `before_insert` and **before** naming. Frappe's order is: `before_insert`, `set_new_name`, then `before_validate`, `validate`, `before_save`, then insert. Controllers that depend on `self.name` inside `validate` (very common in ERPNext) will break. Port the real `insert` and `save` sequence from `vendor/frappe/frappe/model/document.py` (`_validate`, `run_before_save_methods`, `run_post_save_methods`, `check_if_latest`, `set_docstatus`, `validate_higher_perm_levels`, `set_parent_in_children`, `set_new_name`). Also:
- `submit()` must run through the validation pipeline (`validate` then `before_submit`), then set `docstatus = 1`, save, then `on_submit`. It currently skips `validate`.
- `cancel()` must allow `0 -> 2` only via the documented rules (Frappe forbids cancelling a draft; check `docstatus` transitions exactly as `check_docstatus_transition`) and must run the linked-document checks.
- Replace every bare `raise Exception("...")` in `Document` with the Frappe exception class and message Frappe uses (`DocstatusTransitionError`, `ValidationError`, `TimestampMismatchError`, ...). Bare exceptions get mapped to HTTP 417 or 500 incorrectly.
- Remove `except Exception: return` around meta loading in default-value setup; a broken meta must fail loudly.
- Mandatory/select/link/unique validation must run through the same `_validate` pipeline Frappe uses, including child rows with "Row #n" messages.

## Report hygiene
`ERP_PORT_BLOCK1_REPORT.md` contains a literal PowerShell escape (`` `r`n`r`n ``) in the "Document-engine continuation" paragraph. Clean it. The report also still says oracle parity "was not run"; rounding now has oracle-derived values, so state exactly what is oracle-verified and put the oracle fixtures under `apps/frappe/tests/oracle/` as requested earlier.

## Next order of work (unchanged, no new scope)
1. Fix the JWT session bug and add real-JWT tests (blocking).
2. Port the Document `insert`/`save`/`submit`/`cancel`/`delete` pipeline faithfully, with Frappe's exceptions.
3. Naming port, then NestedSet port with the 200-operation consistency test.
4. Remaining 14 pilot controllers (whole files plus upstream tests), then the REST contract and core doctypes.
Report per defect number with exact commands and output.
