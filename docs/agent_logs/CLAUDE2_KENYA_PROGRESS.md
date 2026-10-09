# Claude agent 2 Kenya progress

## 2026-10-04 Deliverable 1: Kenya fixtures (partial)

Done:
- `apps/erpnext/regional/kenya/`: `data.py` (every rate in one module), `setup.py` (`setup(company, patch)` resolved by Company's `install_country_fixtures` and by `install_base_fixtures`), `utils.py` (KRA PIN validation, `^[AP]\d{9}[A-Z]$`, upper-cased), `hooks.py` (doc_events on Customer, Supplier, Company).
- Custom Fields: `kra_pin` on Customer, Supplier, Company; `kenya_vat_treatment` on Item.
- Tax Categories (4), Sales and Purchase Taxes and Charges Templates per company (VAT 16%, 8% fuel, 0% zero rated, exempt) on `Output VAT` and `Input VAT` accounts, Tax Withholding Categories (12) with a `Withholding Tax Payable` account per company.

Rates and effective dates (NOT verified against a KRA source in this session; confirm against the current Finance Act before production):
- VAT 16% standard, 8% fuel (Finance Act 2023 fuel reduction), 0% zero rated, exempt.
- Withholding VAT 2%: effective 2023-09-01 (Finance Act 2023 reduced it from 6%).
- Withholding income tax: resident management/professional/training 5%, contractual 3%, rent 10%, dividends 5%, interest 15%, royalties 5%; non-resident management/professional 20%, rent 30%, dividends 15%, interest 15%, royalties 20%. Single threshold KES 24,000 on VAT WHT and resident services. All rows start 2023-09-01 as a placeholder date, not the statutory date of each rate.

Verified (`TEST_DATABASE_NAME=test_bbs_erp_kenya`, `manage.py test --noinput apps.erpnext.regional.kenya`): 5 tests OK (idempotent setup, exact template rates, withholding rates/thresholds/accounts, KRA PIN validation, Sales Invoice with the 16% template: tax row 1,600, grand total 11,600, GL Debtors 11,600 / Output VAT 1,600 / Sales 10,000). `check` and `makemigrations --check --dry-run` run after the work.

Known gaps:
- Not compared with the real ERPNext oracle (no Kenya template scenario exists in `spike/`).
- Item Tax Templates, Chart of Accounts additions, Purchase Invoice and withholding-deduction tests not done.
- The other slices (sales_invoice, journal_entry, purchase_invoice, crm) not re-run.
- Deliverables 2 to 4 (M-Pesa, eTIMS, reports) not started.

## 2026-10-04 Deliverable 2: M-Pesa

Done (`apps/erpnext/erpnext_integrations/`):
- Doctypes `M-Pesa Settings` (single; Password fields for consumer secret, passkey, security credential, callback token) and `M-Pesa Transaction` (migration `erpnext 0026`). Hand-written JSON, no vendor source.
- `mpesa/client.py`: Daraja client with injectable HTTP callable and clock: OAuth, STK Push, C2B register URLs, B2C, transaction status, reversal. Request fields follow the Daraja documentation from memory (no vendored source); verify against the current Daraja docs before going live.
- `mpesa/callbacks.py`: guest-allowed callbacks `stk_callback`, `c2b_validation`, `c2b_confirmation`, `b2c_result/timeout`, `status_result/timeout`, `reversal_result/timeout` under `/api/erpnext/method/erpnext.erpnext_integrations.mpesa.callbacks.<name>/?token=...`. Guarded by constant-time token compare and optional source-IP allow-list. Idempotent by receipt number.
- `mpesa/api.py`: authenticated endpoints: STK push from a Payment Request, register C2B URLs, B2C payout from a Payment Entry, status query, reversal.
- C2B and STK confirmations create and submit a Payment Entry against the Sales Invoice named in the account reference (allocation capped at outstanding); unmatched references stay recorded and unreconciled.

Verified (`TEST_DATABASE_NAME=test_bbs_erp_kenya`, `manage.py test --noinput apps.erpnext.erpnext_integrations`): 13 tests OK, recorded payload fixtures, no network. Asserts exact request bodies, Payment Entry fields, GL (Cash 11,600 Dr / Debtors 11,600 Cr), idempotency, bad token, disallowed IP, 401 for non-guest methods.

Known gaps: Daraja callbacks carry no signature, so security is token plus IP; Safaricom source IPs must be filled in by the operator. B2C result handler does not yet reconcile to the Payment Entry beyond linking. No Payment Entry creation for overpayment remainder. Security credential encryption (certificate) is expected pre-computed in the settings field. `ERP_PORT_STATUS.md` rows not yet added.
