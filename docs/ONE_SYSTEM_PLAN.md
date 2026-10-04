# One system: merging duplicate stores

Principle: every doctype has one table and one model, every function one implementation, and all modules read and write the same records. Merging storage must not change behaviour: API response shapes, permissions, validation and the front-end contract stay as they are.

Canonical store: the ERPNext/Frappe doctype tables (`tab<DocType>`, models in `apps/erpnext/generated_models.py` and `apps/frappe/models.py`), reached through `apps/erpnext/registry.get_model`. Legacy models in `apps/core`, `apps/crm`, `apps/property`, `apps/leasing` that duplicate a canonical doctype are repointed (foreign keys target the canonical model, data copied by migration), their call sites moved to the canonical model, and the legacy class deleted.

Method per duplicate: (1) list call sites; (2) data-copy migration into the canonical table; (3) repoint foreign keys; (4) move call sites; (5) delete legacy model in a later migration; (6) characterization test where the area had none; (7) full suite, `makemigrations --check`.

Identity note: legacy tables key users by integer pk (`core.User`), canonical tables store the user email string. At the storage boundary keep the external contract (ids stay ids) and convert with one shared helper, not per-module copies.

## Inventory (found 2026-10-04)

Same doctype, two tables:

| Doctype | Legacy | Canonical | Status |
|---|---|---|---|
| Currency | crm.Currency | tabCurrency | done (migrations crm 0030/0031, core 0015) |
| ToDo | core.ToDo (FK users) | tabToDo | planned: shared assignment store, user id/email boundary |
| Comment | core.Comment | tabComment | planned |
| File | core.FileAttachment | tabFile | planned |
| Address, Contact (+Email, Phone) | core.Address/Contact | tabAddress/tabContact | planned, heaviest (20+ call sites, CRM API shape) |
| Email Account, Email Template | core.* | tab* | planned |
| Data Import | core.DataImport | tabData Import | planned |
| Assignment Rule (+User, Day) | core.* | tabAssignment Rule* | planned, together with ToDo and the ported frappe assign_to |
| Gender, Salutation | core.* | tabGender/tabSalutation | planned |
| DocShare | core.DocShare | frappe.DocShare | check |

Same concept under a CRM name:

| CRM model | ERPNext doctype |
|---|---|
| CRMTerritory | Territory |
| CRMHolidayList | Holiday List |
| CRMIndustry | Industry Type |
| CRMLeadSource | Lead Source |
| CRMLostReason | Opportunity/Quotation Lost Reason |
| CRMLead | Lead |
| CRMOrganization | Customer / Prospect |
| CRMDeal | Opportunity (+ Quotation/Sales Order downstream) |
| CRMTask | Task / ToDo |
| FCRMNote | Note / CRM Note |
| CRMServiceLevelAgreement | Service Level Agreement |

Cross-module links that must exist (so a record made in one module is usable in the others): Tenant to Customer, Lease billing to Sales Invoice and Item, Employee to User, Lead to Customer/Opportunity, Timesheet to Sales Invoice.

## Rules for every agent

See "One system rule" appended to each agent prompt: search before creating, reuse, never copy a function, do not extend legacy duplicates, unify without changing behaviour.
