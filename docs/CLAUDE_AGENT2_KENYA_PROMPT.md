# Claude agent 2: Kenya localization (eTIMS, M-Pesa, KRA PIN, VAT and withholding) inside the ERPNext port

Written for: a second Claude Code agent working autonomously in `D:\Clients\BBS-ERP`. Backend only (`backend/`). Do not touch `frontend/`.

## 0. Read first

`docs/CODEX_ERP_PORT_PROMPT.md` (architecture, rules, oracle; section 8 is the Kenya brief), `docs/ERP_PORT_PLAN.md`, `docs/ONE_SYSTEM_PLAN.md`, `docs/ERP_PORT_STATUS.md`, `docs/ERP_PORT_DEVIATIONS.md`, the tail of `docs/agent_logs/CLAUDE_PROGRESS.md`. The standards in those documents bind you: exact upstream-style code in the ERPNext "regional" pattern (not a separate Django app, no `apps/kenya`), no code comments or docstrings, no lint-disable directives, no git commits, additive migrations only, no fabricated verification, one system (below).

## 1. Lanes (four agents share one tree)

- You: `backend/apps/erpnext/regional/**` (new `kenya` package), `backend/apps/erpnext/erpnext_integrations/**` (M-Pesa and eTIMS integration doctypes, controllers, API endpoints), their tests under the same folders, Kenya fixtures installed via a new function called from the existing install flow (see section 5), and `docs/agent_logs/CLAUDE2_KENYA_PROGRESS.md`.
- Claude (main): `apps/core`, `apps/crm` merge into ERPNext tables, `apps/frappe` framework, accounts/stock controllers, registry, generator, `apps/erpnext/install.py`.
- Gemini: projects, support, maintenance, quality_management, ERPNext-side crm, utilities, telephony, communication, portal, bulk_transaction, edi, and the Frappe User/Employee gap.
- Antigravity: HRMS (`apps/hrms/**`), including Kenya payroll rates.
Do not edit other lanes. If you need a change in a shared file, make it small and additive, log it in `docs/ERP_PORT_DEVIATIONS.md` under "Framework change requested by Kenya", and re-run the slices. To hook into install, add one line to `install_base_fixtures` that calls your own function; do not restructure that file.

## 2. One system (mandatory)

BBS-ERP is one system: one table and one model per doctype, one implementation per function, all modules through the same document engine and registry. Kenya data lives on the existing ERPNext records: KRA PIN on Customer/Supplier/Company as Custom Fields (created with `apps/frappe/custom` `create_custom_fields`, the same way `apps/core/crm_custom_fields.py` does), VAT as ordinary Sales/Purchase Taxes and Charges Templates and Tax Categories, withholding as Tax Withholding Categories, M-Pesa receipts as Payment Entries and Payment Requests, eTIMS submissions linked to Sales Invoice / Purchase Invoice / Credit Note / Stock documents by Dynamic Link or Link fields. Never create a parallel customer, invoice or payment table. Users map only through `apps/core/identity.py`. Unifying storage never changes behaviour.

## 3. Sources

- eTIMS: `vendor/kenya_compliance` (direct KRA OSCU, unmaintained, the model to port) and `vendor/kenya_compliance_slade` (Slade360 route, reference only). Provider-neutral interface first: an `EtimsProvider` contract (initialize device, submit sales invoice, submit credit note, submit purchase, submit stock movements, fetch item/code lists, sign/QR data) with a direct OSCU implementation; the Slade route can be added later behind the same interface.
- M-Pesa: Safaricom Daraja (OAuth, STK Push, C2B register/validate/confirm URLs, B2C, transaction status, reversal). There is no vendored source; implement the Daraja contract faithfully (documented request and response fields) and keep credentials in an `M-Pesa Settings` single doctype (secrets as Password fields).
- ERPNext regional pattern: study `vendor/erpnext/erpnext/regional/*` (for example `united_arab_emirates`, `south_africa`) for how a country's setup, hooks, custom fields, tax templates and print formats are wired, and port the Kenya equivalent the same way.

## 4. Deliverables (in this order; finish and verify each before the next)

1. Kenya fixtures: KRA PIN custom fields and validation (format `^[AP]\d{9}[A-Z]$`), Kenya VAT templates (16% standard, 0% zero-rated, exempt, 8% fuel where applicable) as Sales/Purchase Taxes and Charges Templates plus Tax Categories and Item Tax Templates, Tax Withholding Categories (withholding VAT 2%, withholding income tax rates for resident/non-resident services, professional fees, rent, management fees, dividends, interest, with thresholds and effective dates stated in your log), Kenya Chart of Accounts additions the standard chart lacks, KES defaults. Test with Sales/Purchase Invoices through the existing controllers and assert exact tax rows and GL (compare against the real ERPNext oracle in `spike/` where scenarios exist, per section 3 of the old brief).
2. M-Pesa: `M-Pesa Settings`, `M-Pesa Transaction` (C2B/STK ledger of raw callbacks, idempotent by receipt number), STK Push from a Payment Request, C2B confirmation creating a Payment Entry and reconciling to the matching Sales Invoice by account reference, B2C payout from Payment Entry, transaction status query, callback endpoints under `/api/erpnext/method/...` following the existing REST contract (`apps/erpnext/api.py`, `urls.py`) with signature/IP validation where Daraja provides it. Test with recorded Daraja payloads (fixtures under `tests/`); no live network calls in tests, use an injectable HTTP client.
3. eTIMS: provider interface, direct OSCU client, device initialization, item and code-list sync, sales invoice, credit note and purchase submission with the KRA response fields stored on the ERP document (receipt number, internal data, signature, QR URL, SCU id), retry queue on the Celery bridge (`apps/frappe/utils/background_jobs.py`), failure states and manual resubmit, invoice print/QR data. Hook into Sales/Purchase Invoice submit and cancel through `doc_events` in `apps/erpnext/hooks.py` style (add your handlers to the Kenya hooks module, not to shared hooks files, and register through the existing hook merge). Test with recorded OSCU payloads and an injectable HTTP client; assert the exact request bodies against the vendored contract.
4. Reports and compliance outputs: VAT return working (output and input VAT by period, zero-rated/exempt split) and withholding certificate data as ERPNext-style script reports under `regional/kenya/report/`, with tests on seeded invoices.

## 5. Environment

- Python: `backend\.venv\Scripts\python.exe`. If it fails with "Access is denied", write the exact error and commands tried into your progress log and stop (a fallback used before: the pgAdmin Python 3.13 with `backend\.venv\Lib\site-packages` and `backend` on `sys.path`).
- Your own test database: PowerShell `$env:TEST_DATABASE_NAME = "test_bbs_erp_kenya"`; always `--noinput` (also `makemigrations --noinput`); never `--keepdb`; never `test_bbs_erp`.
- Run tests in slices, not one long full-suite run (other agents run concurrently, a full run exceeds the 30-minute background limit). Slices: your own packages, then `apps.erpnext.accounts.doctype.sales_invoice`, `apps.erpnext.accounts.doctype.journal_entry`, `apps.erpnext.accounts.doctype.purchase_invoice`, `apps.crm`.
- Before you start: `manage.py check`, `makemigrations --check --dry-run`, your own slices. After each deliverable: the same, plus `docs/ERP_PORT_STATUS.md` rows, deviations, and a progress-log entry (what was done, exact commands and counts, known gaps, decisions).
- Failures outside your lane are reported as "not mine" with test names; carry on. If blocked, write exactly why and stop.
