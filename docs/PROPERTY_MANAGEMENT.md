# Property Management and Tenant Portal

BBS Mall specific app (`backend/apps/bbs_property`, module "Property Management"), the desk scripts in `frontend/src/modules/bbs_property`, and the tenant portal in `frontend/src/modules/tenant` (`/tenant`).

## What it covers

| Area | Doctypes | Notes |
|---|---|---|
| Space | Property, Property Floor, Rentable Unit | Units carry area, rate per sqm, base rent, service charge, status (Vacant, Reserved, Occupied, Under Maintenance); property occupancy figures refresh automatically. |
| Leasing | Space Enquiry, Lease Agreement (+ Lease Unit, Lease Charge, Lease Rent Schedule, Lease Document) | Rent-free months, percentage or fixed escalation, extra charges, turnover rent, deposit, e-signature, renewal, termination, lease print format. |
| Billing | Lease Billing Run, Lease Deposit | Invoices per billing period with proration, daily automatic invoicing, late fees, deposits posted through Journal Entries. |
| Payments | Mpesa Payment | STK push, Paybill/Till C2B callbacks, automatic allocation to the oldest invoices through Payment Entry. |
| Utilities | Utility Tariff (+ slabs), Utility Meter, Meter Reading | Tiered tariffs, tenant submitted readings with approval, readings billed on the next invoice. |
| Turnover | Tenant Sales Declaration | Turnover rent = max(0, sales x % - base rent for the period), billed after approval. |
| Maintenance | Maintenance Request (+ Maintenance Update) | SLA by priority, assignment, timeline visible to the tenant, recharge invoice, rating. |
| Communication | Tenant Notice | Audience (all, property, selected tenants), scheduled publishing, SMS/email. |
| Reports | Rent Roll, Occupancy and Vacancy, Lease Expiry, Tenant Arrears Aging, Collection Efficiency, Revenue per Sqm, Tenant Statement, Deposit Ledger, Utility Consumption, Maintenance Summary, Turnover vs Base Rent | Workspace "Property Management" with number cards, charts and onboarding. |

## First-time setup

1. `manage.py migrate` then `manage.py setup_property --force` (creates roles Property Manager, Leasing Officer, Property Accountant, Tenant, the Sales Invoice and Customer custom fields, the default items and the callback token, and imports workspace, sidebar, reports, charts and print format).
2. Restart the backend so the new app is loaded.
3. Open **Property Settings**: choose the company, tax template, late fee rules, reminders and the M-Pesa details (consumer key and secret, passkey, shortcode, public site URL, receiving account, mode of payment). Use *M-Pesa > Show Callback URLs* and register the C2B URLs with *Register M-Pesa Paybill URLs*.
4. Create a Property (set the security deposit liability account), its floors and units.
5. Create a Customer, tick **Is Tenant**, then **Tenant > Invite Portal User**.
6. Create and submit a Lease Agreement. Invoices are generated daily, or on demand from a Lease Billing Run.

Demo data: `manage.py seed_property_demo` creates a mall, 16 units, 9 tenants with leases, invoices, payments, meter readings and maintenance requests (login `tenant@bbsmall.demo` / `DemoPass123!`). `--clear` removes it (needs Redis running).

## Tenant portal

`/tenant` uses the normal login (password, SMS code, Google, passkey, forgot password). A user whose account is linked to a Customer through **Tenant Portal Users** is sent to the portal and cannot open the desk. Access levels: Owner (everything, team management, signing), Finance (invoices, payments, statements), Operations (maintenance, utilities, sales declarations). Staff can preview any tenant from *Customer > Tenant > Open Portal as Tenant*.

## Scheduler (daily)

Lease status updates and automatic renewals, rent invoicing, late fees, payment reminders (SMS through HostPinnacle and email), lease expiry alerts, scheduled notices, occupancy figures. Hourly: expire pending M-Pesa prompts.

## Tests

`TEST_DATABASE_NAME=test_bbs_prop python manage.py test apps.bbs_property.tests --keepdb --noinput` (first run builds the test database and can take about 30 minutes).
