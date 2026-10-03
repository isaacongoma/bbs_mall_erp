# ERPNext port plan (backend: Django/DRF, frontend: React/TS)

Source of truth: `vendor/erpnext/erpnext` (ERPNext v16-era: has Subcontracting Inward, Financial Report Templates,
Bank Transaction Rules). Goal: a faithful port of every in-scope doctype, controller, report and form script, with
exact field names, naming, permissions, document states and ledger postings. No simplified re-modelling.

## 1. What was scanned

| Module (ERPNext) | Doctypes | Reports | Python (non-test) | JS form scripts |
|---|---|---|---|---|
| accounts | 192 | 61 | 76.8k | 18.5k |
| stock | 81 | 57 | 59.2k | 12.8k |
| controllers (shared engine) | - | - | 16.1k | - |
| selling | 21 | 24 | 12.1k | 9.2k |
| setup | 41 | - | 8.7k | 2.2k |
| assets | 27 | 4 | 7.5k | 2.5k |
| buying | 20 | 11 | 6.9k | 3.0k |
| projects | 16 | 6 | 3.4k | 1.3k |
| regional | 6 | 5 | 3.3k | 0.3k |
| support | 12 | 5 | 2.6k | 0.7k |
| utilities / maintenance / quality | 28 | 7 | 3.7k | 0.6k |
| crm (ERPNext side: Opportunity, Prospect, Campaign, Contract...) | 30 | 10 | ~5k | - |
| subcontracting | 14 | 5 | 3.3k | 1.7k |
| **Excluded: manufacturing** | 50 | 23 | 46.8k | - |

In scope: roughly 490 doctypes, 200 reports, ~210k lines of Python and ~55k lines of client script.
The framework (Frappe) is not vendored, so its behaviour must be rebuilt too (section 3, Phase 0).

Already in the repo and to be reconciled: `apps/accounting` (7 simplified models: Company, Account, Sales Invoice,
Payment Entry, GL Entry...), `apps/property`, `apps/leasing`, `apps/payments` (M-Pesa), `apps/iot`, `apps/helpdesk`,
and the CRM/core primitives (naming, comments, todo, docshare, assignment rules, data import, web forms,
automation engine). The simplified `accounting` models get replaced by faithful ports; the others get re-wired to them.

## 2. Approach: port, do not re-model

1. **Doctype codegen.** A generator reads each ERPNext `*.json` doctype (fields, istable, issingle, is_submittable,
   autoname/naming_series, title_field, search_fields, sort, permissions, links, fetch_from, depends_on,
   mandatory_depends_on, read_only_depends_on, options, in_list_view, in_standard_filter, track_changes) and emits
   Django models, migrations, DRF serializers/viewsets, meta entries and child-table inlines. Hand-written code is
   only the controller logic (`.py`) and the form script (`.js`). This keeps field names, types and layout identical
   and makes the port auditable against the vendor tree.
2. **Controllers ported line for line** into the same class hierarchy: `Document` base, `AccountsController`,
   `StockController`, `SellingController`, `BuyingController`, `StatusUpdater`, `taxes_and_totals`, mapper
   (`make_mapped_doc`), sales/purchase returns, budget controller, ledger preview.
3. **Reports ported with their query logic** (SQL to ORM/raw SQL on PostgreSQL), same filters and columns.
4. **Frontend is the existing React app.** Each ERPNext form gets its layout from the doctype definition through the
   existing `FieldLayout`/`useDocument` runtime, plus a TS port of its client script (`useFormScriptActions`
   hooks: `setup`, `refresh`, field triggers, `set_query`, custom buttons, Create menus).
5. **Parity tests.** Each module ships with the ERPNext `test_*.py` cases ported, plus ledger invariants
   (GL vs sub-ledger, SLE vs Bin vs stock GL, trial balance = 0). A module is done only when its ported tests pass.

## 3. Phases

### Phase 0: Frappe framework layer (blocks everything)
- Document lifecycle: docstatus 0/1/2, submit/cancel/amend, `amended_from`, the full hook chain (`validate`,
  `before_save`, `on_update`, `before_submit`, `on_submit`, `before_cancel`, `on_cancel`, `on_trash`, `after_insert`),
  `db_set`, flags, `get_doc`-style API, load/modified-timestamp conflict check, cancel/delete link checks,
  rename with link updates, `fetch_from`, `set_missing_values`, `get_query` link search.
- Naming: all `autoname` modes (naming series, `format:`, `field:`, `hash`, `Prompt`), per-company series prefixes.
- Permissions: role matrix from doctype JSON, permission levels, `if_owner`, User Permissions, Doc Share,
  `apply_strict_user_permissions`, restriction by Company/Cost Center/etc., field-level (permlevel) masking.
- Workflow engine (states, transitions, conditions, role gating, docstatus mapping), Versions/audit trail,
  tags, follows, print formats and Letter Heads (HTML/Jinja to PDF), Notifications/Email Alerts, Number Cards,
  Dashboards/Charts, Report engine (Query, Script, Report Builder), Custom Fields and Property Setters,
  translations, number/currency/date formatting and `flt`/`rounded` rounding semantics, global search,
  bulk transactions, scheduler events (Celery beat) and background jobs, NestedSet trees (Account, Cost Center,
  Warehouse, Item Group, Territory, Customer Group, Supplier Group, Sales Person, Department, Location, Task, Project).
- Fixtures and data: countries, currencies, charts of accounts, tax templates, UOM, default roles.

### Phase 1: Setup and masters (`setup`, `utilities`, `regional` shell)
Company (with chart-of-accounts creation, default accounts, default cost center and warehouses),
Currency, Currency Exchange, Fiscal Year, UOM and conversion factors, Item Group, Brand, Customer Group, Territory,
Sales Person, Sales Partner, Supplier Group, Terms and Conditions, Holiday List, Branch, Department, Designation,
Employee (the minimal ERPNext one; HR/Payroll is a separate app and out of scope), Driver, Vehicle, Incoterm,
Global Defaults, Authorization Rules, Email Digest, Transaction Deletion Record, Rename Tool, Setup Wizard.

### Phase 2: Accounts (largest; 192 doctypes, 61 reports)
- Foundation: Account tree, Cost Center and allocations, Accounting Dimensions (and filters), Fiscal Year,
  Accounting Period, Finance Book, Currency Exchange Settings, Pegged Currencies.
- Ledger engine: `general_ledger.py` (make/merge/reverse GL entries, round-off, exchange gain/loss, immutable ledger,
  accounting-period and frozen-date checks), GL Entry, Payment Ledger Entry, Advance Payment Ledger Entry,
  `party.py` (party account, details, credit limit), `utils.py` (balances, exchange rates, fiscal year lookups).
- Transactions: Journal Entry (+ templates, inter-company), Sales Invoice, Purchase Invoice, POS Invoice
  (POS Profile, Opening/Closing Entry, merge log, consolidation), Payment Entry, Payment Request,
  Payment Reconciliation, Unreconcile Payment, Payment Terms/Schedule, Payment Order, Dunning,
  Invoice Discounting, Opening Invoice Tool, Subscription (+ plans, process), Loyalty Program/Points, Coupon Code.
- Pricing and tax: Pricing Rule, Promotional Scheme, Tax Rule, Item Tax Template, Sales/Purchase Taxes and Charges
  templates, Shipping Rule, Tax Category, Tax Withholding Category/Entry, `taxes_and_totals` (inclusive taxes,
  discounts, rounding, multi-currency, advances).
- Period operations: Period Closing Voucher (+ process), Exchange Rate Revaluation, Deferred revenue/expense
  (+ process), Budget (+ distribution, controller), Repost Accounting Ledger, Repost Payment Ledger,
  Ledger Merge, Ledger Health, Cost Center Allocation, Bisect Accounting Statements.
- Banking: Bank, Bank Account, Bank Transaction (+ rules), Bank Reconciliation Tool, Bank Statement Import,
  Bank Clearance, Bank Guarantee, Cheque Print Template, Plaid integration hooks.
- Other: Chart of Accounts Importer, Mode of Payment, Payment Gateway Account, Process Statement of Accounts,
  Share Management (Shareholder, Share Type/Transfer/Balance), Financial Report Templates, Accounts Settings.
- Reports (61): General Ledger, Trial Balance (+ party, simple, consolidated), Balance Sheet, Profit and Loss,
  Cash Flow, Accounts Receivable/Payable (+ summary, consolidated), Payment Ledger, Gross Profit, registers
  (Sales, Purchase, Item-wise), Budget Variance, Deferred Revenue and Expense, Tax Withholding, Financial
  Ratios, Dimension-wise balance, Bank reconciliation statements, and the rest listed under `accounts/report`.

### Phase 3: Stock (81 doctypes, 57 reports)
Item (variants, attributes, barcodes, UOM conversion, defaults, reorder, suppliers, taxes), Warehouse tree and types,
Price List and Item Price, Bin, Stock Ledger Entry engine (`stock_ledger.py`: FIFO, LIFO, Moving Average,
backdated reposting, negative-stock rules, batch/serial valuation), Serial and Batch Bundle, Serial No, Batch,
Stock Entry (+ types), Stock Reconciliation, Delivery Note, Purchase Receipt, Material Request, Pick List,
Packing Slip, Putaway Rule, Stock Reservation, Landed Cost Voucher, Quality Inspection (+ templates), Shipment,
Delivery Trip, Repost Item Valuation, Stock Closing Entry/Balance, Inventory Dimension, Stock Settings;
perpetual-inventory GL postings through `StockController`; the 57 stock reports.

### Phase 4: Selling and Buying (41 doctypes, 35 reports) plus the shared sales/purchase controllers
Customer (credit limits, portal users), Quotation, Sales Order, Product Bundle, Sales Team and commission,
Installation Note, Selling Settings; Supplier, Request for Quotation, Supplier Quotation, Purchase Order,
Supplier Scorecard (+ criteria, variables, standings), Buying Settings. Full document flow with `make_*` mappers
(Quotation to Sales Order to Delivery Note to Sales Invoice and the buying mirror), returns and credit/debit notes,
status updaters, reservation and billing percentages, drop-ship and inter-company flows.
ERPNext-side CRM (Opportunity, Prospect, Campaign, Contract, Appointment, Competitor) is included and bridged to
the existing Frappe CRM port through the current ERPNext integration points.

### Phase 5: Assets, Projects, Support, and the smaller modules
Assets (Asset, Category, depreciation schedules and posting, movement, repair, capitalization, value adjustment,
maintenance, location), Projects (Project, Task, Timesheet billing, Activity Cost, templates), Support (Issue, SLA,
Warranty Claim; reconciled with the existing `helpdesk` app), Maintenance (Schedule, Visit), Quality Management,
Regional compliance doctypes that apply.

### Phase 6: Frontend (React/TS, same app and module registry)
- Generic ERPNext runtime on top of the existing one: full Form view (tabs, sections, child-table grids with
  row editors, dashboard connections, timeline, workflow actions, status indicators, Create menu with mappers,
  Print/PDF/Email, Attach, Assign, Share, Tags, Links), List/Report/Kanban/Calendar/Gantt/Tree views,
  Report viewer (Query/Script/Builder, grouping, totals, charts, financial statements with periodicity),
  Workspaces per module (shortcuts, number cards, charts), dashboards, Setup Wizard, Settings pages.
- Purpose-built screens: POS, Bank Reconciliation Tool, Payment Reconciliation, Chart of Accounts tree,
  Stock Balance/Ledger drill-downs, Asset depreciation views, Process Statement of Accounts.
- Per-doctype port of the 55k lines of client scripts.

### Phase 7: Integration with the existing BBS MALL ERP
Tenants as Customers, leases generating Sales Invoices and payment schedules, M-Pesa transactions posting Payment
Entries, property and unit costs in Cost Centers, IoT/parking revenue into the ledger, helpdesk linked to Support,
CRM linked to Quotation/Sales Order. Kenya compliance (KRA VAT, eTIMS, withholding tax, Kenya chart of accounts)
as a regional layer after the core is stable.

### Phase 8: Hardening
Ported test suites green, ledger invariant reports clean, permission audit, performance on large ledgers
(partitioning/indexes on GL, SLE, Payment Ledger), idempotent reposting, backup/restore and fixtures.

## 4. Order of work and gates

Phase 0 gates everything. Then Setup, Accounts foundation and ledger engine, then Selling and Buying
transactions against Accounts, then Stock (Selling/Buying invoices work without stock first, then stock-enabled
flows are switched on), then Assets/Projects/Support. Frontend for each module follows its backend by one step,
not at the end. Each gate: ported tests green, no open parity gaps listed in `docs/ERP_PARITY.md`.

## 5. Decisions needed

1. Subcontracting needs BOM (manufacturing). Recommendation: exclude, along with Maintenance/Quality only if you
   do not need them (they are small and independent, so recommendation is to include those two).
2. HR/Payroll is not in the vendor tree. Employee stays minimal unless you want HRMS ported later.
3. Replace `apps/accounting` with the faithful port (recommended) and migrate any existing data.
4. Confirm the codegen approach (generate models from vendor doctype JSON, hand-port controllers).
5. Kenya localization scope and timing.

## 6. Decisions taken and status (2026-10-02)

- Removed the simplified `accounting`, `payments` and `helpdesk` apps (backend and frontend). Archive and full DB dump are
  in `D:\Clients\BBS-ERP-archive`. The dropped tables held no rows. IoT parking no longer creates invoices
  (migration `iot.0002`); it will be re-wired to the ported Sales Invoice.
- Support (Issue, SLA, Warranty Claim) and M-Pesa now come only from the ERPNext port and the Kenya layer.
- HRMS is deferred; it will be ported after the ERP core.
- Kenya localization and eTIMS are in scope.
- Vendored sources: `vendor/erpnext`, `vendor/frappe` (framework, develop branch), `vendor/kenya_compliance`
  (direct KRA OSCU integration, no longer maintained), `vendor/kenya_compliance_slade` (eTIMS through Slade360, active).
  The GitHub search found no separate "Kenya localization" app; localization is the Kenya chart of accounts, VAT
  codes and tax templates, withholding tax, eTIMS item/unit/tax codes, and KRA PIN validation, built as `apps/kenya`.

## 7. How the Frappe framework is wired in

`vendor/frappe` is the reference for the Phase 0 layer in `apps/core`. Mapping: `frappe/model` (document.py, naming.py,
base_document.py, mapper.py, workflow.py, rename_doc.py, delete_doc.py) to the Document base class and lifecycle;
`frappe/permissions.py` and `frappe/core/doctype/user_permission` to the permission layer;
`frappe/desk/query_report.py`, `reportview.py`, `form/load.py` to the report/list/form APIs;
`frappe/utils/nestedset.py` to tree handling; `frappe/utils/data.py` (flt, cint, rounded, formatdate, money_in_words)
to `apps/core/utils`; `frappe/email`, `frappe/printing`, `frappe/workflow`, `frappe/automation` to their Django
counterparts; `frappe/core/doctype/*` (Role, DocPerm, Version, Custom Field, Property Setter, Number Card, Dashboard,
Report, Print Format, Letter Head, Notification, Workflow) generated through the same doctype codegen as ERPNext.

## 8. Spike result (2026-10-03): embed the real Frappe + ERPNext

The vendored sources are Frappe/ERPNext v17-dev (Python 3.14). A spike in `spike/` (Python 3.14 venv, Postgres schema
`frappe_spike` inside the `bbs_erp` database, `db_schema` is a supported Frappe setting) proved the real framework runs here:

- `import frappe` / `import erpnext` work on Windows with a small shim (`os.register_at_fork`, `faulthandler.register`,
  missing POSIX signals, `fcntl`/`resource` stubs) and `fakeredis` in place of Redis.
- Frappe core (about 270 tables) and ERPNext (about 490 more) installed through Frappe's own `install_app`.
- Setup Wizard created "BBS Mall Ltd" in Kenya (KES, standard chart of 99 accounts, Fiscal Year 2026).
- A submitted Sales Invoice with 16% VAT posted the correct GL entries (Debtors 116,000 / Sales 100,000 / VAT 16,000).

Consequence: instead of re-writing 210k lines, run the unmodified ERPNext code and wire it into the existing app:
Django stays the HTTP/auth gateway (JWT), requests set the Frappe user and call `frappe.client` / `frappe.desk` methods,
the React frontend consumes them, and Frappe tables live in their own Postgres schema. Kenya localization and eTIMS become
ERPNext-style app code (`regional` pattern) on top. Required: Python 3.14 for the backend, Redis replacement (fakeredis or a
real Redis/Memurai), a user bridge between `core_user` and Frappe `tabUser`, and the Windows shim as a package.
