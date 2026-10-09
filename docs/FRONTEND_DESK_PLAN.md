# Frontend Desk plan (ERPNext first, then HRMS)

## Why this plan
Measured on 2026-10-07 with `backend/scripts/audit_form_scripts.py`:
- ERPNext ships 392 doctype scripts (45,985 lines, 444 custom buttons), 174 report scripts (11,649 lines), 61 shared client files (21,917 lines, e.g. `controllers/transaction.js` 3,498 lines) and 16 page scripts.
- The 48 hand-written ports in `modules/erpnext/doctypes` hold 1,960 lines for 19,456 original lines (10 percent). Their behaviour differs from the originals (for example Department root handling).
- The existing CRM form-script engine (`shared/data/script.ts`) is the small FCRM "Form Script" model (`onLoad`, `actions`, `statuses`). It cannot run the real Frappe `frm` API, which the originals use 4,969 times for `frm.doc`, 555 for `set_query`, 527 for `set_value`, 458 for `trigger`, 443 for `add_custom_button`.

Hand-translating 390 scripts onto that engine will always be thin. The faithful route is the one we use for the Python backend: port the original text mechanically and provide the runtime it expects.

## Architecture
1. **Frappe client runtime** in `frontend/src/shared/frappe/`: `frappe` (ui.form.on, model, call, db, utils, msgprint, throw, confirm, prompt, ui.Dialog, set_route ...), `erpnext`, `__`, `cur_frm`, number/date helpers, and `FormController` (the `frm` object: doc, events, set_query, set_value, set_df_property, toggle_*, add_custom_button, set_intro, dashboard, trigger, refresh_field, add_child, clear_table, call, save, reload_doc, has_perm, grids ...) with Frappe's `ScriptManager` semantics (handler order, promises run serially, `setup` immediate).
2. **Mechanical port tool** `frontend/scripts/portClientScript.mjs`: reads an original `.js`, strips comments, annotates parameters, adds the runtime imports, removes unused parameters, formats with Prettier. Output keeps the original logic line for line. Run it for every file; hand edits only where the original touches jQuery DOM.
3. **Desk form view** (`shared/pages/DeskFormPage`) rebuilt on `FormController`: layout from `FieldLayout` in standalone mode, grids, toolbar, custom buttons and groups, intro and dashboard headlines, field property overrides, Link queries from `set_query`, workflow, timeline, sidebar.
4. **Shared client code first**: `erpnext/public/js/**` (utils, controllers, transaction, taxes_and_totals, queries, sales_common, buying, serial/batch selectors ...) ported as the `erpnext` namespace before the doctype scripts.
5. **Doctype scripts**, then **report scripts**, then **page scripts**, ERPNext first (Accounts, Stock, Selling, Buying, Setup, then the rest), HRMS afterwards.

## Layout
- `shared/frappe/` runtime (generic, used by every module).
- `modules/erpnext/<module>/doctype/<name>/<name>.ts` ports (same relative path as the vendor tree), `modules/erpnext/public/js/**` shared files, `modules/erpnext/<module>/report/<name>/<name>.ts`.
- `modules/hrms/...` the same way later.

## Done criteria per script
Ported file passes `typecheck` and `lint`; every handler, button and query of the original is present (audit shows 100 percent of handlers); a behaviour test exists for the non-trivial handlers; the gap list in `docs/frontend_desk_gaps.md` records anything that depends on a runtime feature not built yet.

## Status log
See the end of this file; updated as slices land.

### 2026-10-08 Batch port landed
- `scripts/portClientScript.mjs` hardened: var hoisting keeps function scope, `&` on booleans and `parseInt(non-string)` coerced, class index signatures, unused locals removed, `$`/`frappe`/`erpnext` detected from the AST.
- Ported mechanically and typechecked/linted clean: 392 doctype scripts, 174 report scripts, 16 page scripts, 56 `public/js` files under `frontend/src/modules/erpnext/**`. These files are now the canonical source; do not re-run the batch over `doctype/` (hand edits applied). `scripts/optionalParams.mjs` makes ported parameters optional like JS.
- Runtime additions: `shared/frappe/globals.ts` (window-backed `cur_tree/cur_pos/cur_page/cur_dialog/cur_list`, `hide_field`, `set_field_options`, `refresh_field/refresh_many`, `repl`, `open_url_post`, currency symbol and rounding helpers, `onScan`, `Plaid`, `Awesomplete`), jQuery as `$`, dayjs as `moment`, desk boot docs synced into `locals`.
- ESLint override for `src/modules/erpnext/**` relaxes no-this-alias, no-unused-expressions, no-useless-assignment, prefer-const, no-unsafe-finally (upstream idioms).
- Still to build: `frappe.ui.Dialog/Tree/Grid/Page` and other missing `frappe.*` APIs (strict proxy throws), script registration through `registerClientScripts`, the Desk form/list/report/tree/page views on `FormController`, behaviour tests per script.

### 2026-10-08 Architecture change: upstream client runs verbatim
- The hand-written FormController approach was replaced by porting the real Frappe client (`frappe.ui.form.Form`, Layout, Section/Tab/Column, Grid/GridRow, controls, Page, Toolbar, Dialog/FieldGroup, messages, model/meta/perm/workflow/sync/create_new, save, request.js, db.js, utils, microtemplate, formatters, templates) into `frontend/src/shared/frappe/upstream/**` with `scripts/portFrameworkFiles.mjs`. They run on detached jQuery DOM; React renders from adapters (`shared/frappe/formAdapter.ts`, `formContext.ts`, `formStore.ts`, `formView.ts`).
- Replaced third-party widgets with headless overrides (`shared/frappe/ui/controls.ts`: date/time pickers, rich editors, attach, geolocation ...), bootstrap `$.fn.modal` with a store-backed plugin (`ui/modal.ts`), ajax via a jQuery transport (`ajax.ts`).
- React: `FrappeFormToolbar`, `FrappeFormBody`, `FrappeFormDashboard`, `FrappeDialogHost`, `DeskFormPage`, hook `useFrappeForm`.
- Verified by `src/shared/tests/formLifecycle.test.ts` and `frappeFormView.test.tsx`.
- Still to do: client script registration through the loader (`ensureDoctypeScripts`), `erpnext.bundle` shared scripts, list/report/tree/page views, quick entry, FileUploader, workspace/sidebar navigation for ERPNext/HRMS, remove the old FormController, desk boot in the app shell.
