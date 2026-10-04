# Grok handoff: ERPNext port, Block 1 continuation

You continue a native Django port of ERPNext v17 (no Frappe embedding) inside `D:\Clients\BBS-ERP\backend`. Codex then Gemini worked before you. A reviewer (Claude) checks your work from the log files only; log after every finished step because your context may auto-compact and the run may stop at any time, so your final report must be complete and honest.

## Read first (in this order)
1. `docs/CODEX_ERP_PORT_PROMPT.md` (rules, environment, oracle use, pitfalls, blocks)
2. `docs/GEMINI_HANDOFF_PROMPT.md` (items 0-7, fixed order)
3. `docs/GEMINI_BLOCK1_REVIEW_COMMENT_1.md` (review of Gemini's last round: defects 1-7 plus missing items)
4. `docs/ERP_PORT_STATUS.md` and `docs/ERP_PORT_BLOCK1_REPORT.md`

## Hard rules
- Never write code comments. No lint-disable directives. No commits. No Block 2.
- Port faithfully from `vendor/frappe` and `vendor/erpnext`; never invent behaviour. Verify numbers against the oracle in `spike/` or upstream test files; never assert unchecked expectations.
- No `except Exception: pass`. Use Frappe exception classes.
- Do not edit a ported controller to make it run; implement the missing function in `apps/frappe`.
- Run tests with: `cd backend; .venv\Scripts\python.exe manage.py test` (plain, whole suite).

## Status of earlier steps (round 3 start)
DONE and verified by the reviewer (suite: 163 tests OK, check and makemigrations clean): Step 0, Step 1, delete_doc port (A1), rename_doc port (A2, 576 lines, tests in `apps/frappe/tests/test_rename_doc.py`, fixed by the reviewer: `get_doc` now raises `DoesNotExistError`; `get_controller` resolves `TermsandConditions`). All code comments were stripped by script from `apps/frappe` and `apps/erpnext`; do not reintroduce any (a grep for `#` comments must return nothing outside migrations).

Do not redo any of that. Read `docs/agent_logs/GROK_PROGRESS.md`, `GROK_FINAL.md`, and `docs/agent_logs/round1/` for history. Keep the suite green after every item.

Lessons from review (apply to every port):
- `get_controller`/`get_doc` silently fall back to plain `Document` on any exception. After porting a controller, assert in a test that `type(get_doc(...))` is the controller class. Narrow that fallback to `ImportError` only and fix whatever surfaces.
- Do not swallow exceptions; only catch what upstream catches.
- Date/time parity tests must compare against upstream semantics, not invent expectations.

## Step A (remaining)
A2 is done except logging: append the `Step A2 rename_doc` block to `docs/agent_logs/GROK_PROGRESS.md` describing what is and is not ported (check against `vendor/frappe/frappe/model/rename_doc.py`, list skipped functions with reasons) and update `docs/ERP_PORT_STATUS.md`.
A3. Regenerate every oracle fixture under `apps/frappe/tests/oracle/` from `spike/` where the oracle can produce it, keep the generator script in `spike/`, and state per fixture whether it is oracle-derived or upstream-derived.

## Step B: remaining Block 1 items, one at a time, whole upstream file plus its upstream test
Order: Item Group, Cost Center, Currency, UOM, Holiday List, Branch, Department, Designation, Terms and Conditions, Territory, Customer Group, Supplier Group, Sales Person, then the utilities port (`frappe.utils`), REST contract, Frappe core doctypes, child-table semantics, permission leftovers (DocShare write/share, query-condition parity, `get_permitted_fields`).
Update `docs/ERP_PORT_STATUS.md` honestly after each item (status per row: generated / controller ported / tested / oracle-verified).

## Logging contract (mandatory, the reviewer reads only this)
After EVERY completed step or item, append to `docs/agent_logs/GROK_PROGRESS.md` a block:

```
## <step/item> <timestamp>
Result: done | partial | blocked
Files changed: <list>
Commands run and last lines of output (tests: count, OK/FAILED)
Root causes / decisions
Not done / known gaps
```
At the very end write `docs/agent_logs/GROK_FINAL.md` with: full test command output tail, per-defect status table, list of items still open, and anything you were unsure about. Never claim "fixed" without the passing test output pasted in the log.
