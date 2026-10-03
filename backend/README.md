# BBS-ERP backend

Django/DRF backend, structured with one Django app per Frappe "app" (`apps/crm`,
`apps/core`) and one folder per DocType (`apps/crm/doctype/<name>/`), so each
module can be cross-referenced against its source in `../vendor/crm` and
`../vendor/erpnext`.

## Local setup

Prerequisites: Python 3.13, PostgreSQL running locally (a `bbs_erp` database
and `bbs_erp` role already exist on this machine from initial setup).

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements\dev.txt
copy .env.example .env      # already present locally; edit if your DB creds differ
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API docs: `http://127.0.0.1:8000/api/docs/`
Admin: `http://127.0.0.1:8000/admin/`
Auth: `POST /api/auth/token/` with `{"email": "...", "password": "..."}` returns
a JWT pair; send `Authorization: Bearer <access>` on subsequent requests.

## What's ported vs. stubbed (CRM module)

Ported with full validation/business logic, verified against a real Postgres
database:
- **Lead** (`apps/crm/doctype/lead/lead.py`) — autoname, full-name/lead-name
  derivation, status defaulting, email validation, lost-reason validation,
  SLA application, status-change logging, owner assignment/sharing, and a
  real conversion flow (`POST /api/crm/leads/<name>/convert-to-deal/`) that
  creates a Contact, an Organization, and a Deal.
- **Deal** (`apps/crm/doctype/deal/deal.py`) — same depth as Lead: primary
  contact/email derivation from its Contacts table, forecasting validation,
  exchange-rate lookup, SLA application, status-change logging, assignment/
  sharing. `POST /api/crm/deals/` plus `add-contact` / `remove-contact` /
  `set-primary-contact` actions.
- **Contact** and **CRM Organization** — full create/update flow, including
  Contact's denormalized primary email/phone from its child tables.
- **SLA engine** (`apps/crm/doctype/service_level_agreement/`) — the full
  `get_sla()` matching + `apply()`/`calc_time()`/`calc_elapsed_time()` business-hours
  math, condition matching via a hand-rolled AST-restricted evaluator
  (`condition_eval.py`) instead of `eval()`. Verified with working hours,
  weekend rollover, and reply-triggered `first_response_time`/`sla_status`.
- **Assignment & sharing** (`apps/core/assignable.py`, backed by `ToDo` and
  `DocShare` models ported from `frappe/frappe`) — shared by Lead and Deal.
- **Exchange rates** (`apps/crm/exchange_rate.py`) — same multi-provider
  fallback chain (Frankfurter → fawazahmed) as the original, using Django's
  cache framework in place of `frappe.cache()`.
- Lookup tables seeded with the original install script's exact data
  (`apps/crm/migrations/0002_seed_defaults.py`): Lead/Deal Status, Communication
  Status, Industry, Lead Source, Lost Reason, Currency, FCRM Settings.

- **Task** (`apps/crm/doctype/task/task.py`) — autoincrement PK, single-assignee
  ToDo creation/reassignment on save.
- **FCRM Note**, **CRM Call Log** (`apps/crm/doctype/call_log/`) — including
  the generic `links` table, `create_lead_from_call_log`, and `get_call_log`'s
  aggregated notes/tasks/lead/deal payload.
- **Territory** — full nested-set (`lft`/`rgt`) maintenance ported from
  Frappe's `update_add_node`/`update_move_node` (verified: insert, and
  re-parenting an existing subtree, both produce correct lft/rgt ranges).
- **Dashboard** (`apps/crm/dashboard_api.py`) — all ~15 chart data functions
  (total leads, ongoing/won deals, sales trend, forecasted revenue, funnel
  conversion, deals by stage/source/territory/salesperson, lost deal reasons)
  ported from raw SQL query-builder calls to Django ORM aggregation
  (`Case`/`When`, `Sum`, `Avg`, `Count`, `TruncDate`/`TruncMonth`).
  `GET /api/crm/dashboard/`.
- **Telephony settings** — CRM Twilio Settings, CRM Exotel Settings, CRM
  Telephony Agent data models ported (`apps/crm/doctype/twilio_settings/`,
  `exotel_settings/`, `telephony_agent/`).

- **Domain enrichment** (`apps/crm/domain_enrichment/`) — the full website
  crawler subsystem: SSRF-guarded fetcher with DNS-rebinding-safe IP pinning
  (`http.py`), same-domain BFS crawler with sitemap discovery and robots.txt
  respect (`crawler.py`), config-driven extractors for JSON-LD/meta/company
  name/description/emails/phones/social profiles/industry classification
  (`extractors.py` — ported verbatim, zero framework coupling in the
  original), the field-mapping write engine (`mapper.py`), and the
  orchestration pipeline (`pipeline.py`). Backed by all 8 sub-doctypes
  (Settings, Rule, Rule Pattern, Field Mapping, Link Priority, Skip Pattern,
  Domain, Run) seeded with the original's exact 25-industry keyword table and
  6 social-network regex rules (`apps/crm/migrations/0005_seed_enrichment_defaults.py`).
  `frappe.enqueue`/`publish_realtime` → Celery task + Django Channels group
  send (`tasks.py`). **Verified against a real live website**: crawl → company
  name/description/logo/social extraction → field-mapping write-back onto an
  Organization → Enrichment Run record → cross-record copy onto a newly
  linked Lead, all correct end-to-end.
- **Telephony** (`apps/crm/integrations/`) — real Twilio (`twilio` SDK:
  `AccessToken`/`VoiceGrant`, TwiML `Dial`/`VoiceResponse`, call-status
  webhooks) and Exotel (REST API + webhook) clients, not just settings
  models: call routing to the right agent (`get_the_call_attender`, ported
  with Django sessions in place of Frappe's), the SSRF-guarded recording
  proxy, note/task linking. **Verified**: call-log creation and phone-number
  linking to an existing Lead work correctly for both providers. Live
  inbound/outbound calling itself needs real Twilio/Exotel account
  credentials to test beyond this (same requirement the original has).
- **WhatsApp** (`apps/crm/integrations/whatsapp_views.py`) — ported the real
  crm-side logic (access control, message-list assembly), preserving the
  original's own graceful `False`/`[]` fallback. Its `WhatsApp Message`
  doctype was never part of `frappe/crm` itself — it belongs to a separate
  third-party Frappe app (`frappe_whatsapp`) that crm only integrates with
  *if installed*. Not fabricated here, for the same reason the original
  doesn't inline it.
- **ERPNext mirror-sync** (`apps/crm/integrations/erpnext_sync.py`) — ported
  the `should_sync()` gate, correctly inactive. The original bridges two
  Frappe apps sharing one database (CRM Product ↔ ERPNext Item); since
  ERPNext isn't part of this port, the ~230-line sync engine behind the gate
  would be entirely dead code, so only the gate itself is ported.

Simplified (functionally equivalent, not a line-for-line port):
- **`copy_enrichment_from_organization`** now reuses the real mapper/config
  engine above (`apps/crm/cross_record.py`), matching the original exactly.
- **`get_contact_by_phone_number`** (`apps/crm/telephony_utils.py`) — the
  original uses `phonenumbers` (libphonenumber) to normalize into a
  country + national-number pair; this matches on cleaned digits instead.
  Same intent (match despite formatting), no fuzzy country inference.

Not started:
- The entire frontend (no Vue project exists yet).
- ERPNext — untouched.

## Adding a new DocType

1. Read the source JSON + controller under `vendor/crm/crm/fcrm/doctype/<name>/`
   or the equivalent ERPNext path.
2. Create `apps/<app>/doctype/<name>/<name>.py` with a Django model translating
   the JSON fields, plus a `save()`/`clean()` override porting the
   `validate`/`before_save`/etc. hooks.
3. Re-export it from `apps/<app>/models.py`.
4. Add `<name>_serializer.py` and `<name>_views.py` next to it, and register
   the viewset in `apps/<app>/urls.py`.
5. `python manage.py makemigrations <app> && python manage.py migrate`.
