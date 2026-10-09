# Codex prompt: the Desk layer (generic list/form/report/workspace) + HR manager screens

Paste everything below the line into Codex. Run it in parallel with, or after, `docs/CODEX_HRMS_FRONTEND_PROMPT.md` (the employee self-service app). This prompt is the larger half: what HR managers, accountants, stock keepers and everyone else use all day.

---

You are building the Frappe "Desk" experience in React inside the BBS-ERP monorepo, then using it to deliver the HR manager functionality of Frappe HR.
Repo: `D:\Clients\BBS-ERP`. React app: `frontend/`. Backend: `backend/` (Django, already serves the Frappe desk methods).

## The one-app rule
BBS ERP is ONE application: one shell, one sidebar, one set of components, one look. CRM, ERPNext, HRMS, property, leasing and IoT are modules of that single app, not separate apps. Users move between them from the module rail and the sidebar without ever feeling a seam. Everything you build for HR must be generic first (Desk layer in `shared/`), so Accounts, Stock, Selling, Buying, Projects, Support, Assets and Manufacturing get the same screens for free. HR-specific code in `modules/hrms/` is only what is truly HR-specific.

## Product bar
Enterprise-grade, premium, for a high-end mall. Pixel-faithful to the original Frappe UI, consistent with the CRM we already ported (same feel, spacing, colours, motion, icons). No placeholders, stubs, "coming soon", or simplified versions. Real loading / empty / error / permission states, keyboard support, accessibility, dark mode, responsive.

## What already exists (REUSE; do not rebuild)
Read how CRM was built first: `frontend/src/modules/crm/**`, `frontend/src/shared/**`, `frontend/src/design-system/**`, `frontend/src/core/**`.
- `design-system`: Button, Dialog, Dropdown, Popover, Tabs, FormControl, Select, Combobox, MultiSelect, DatePicker family, ListView family, Charts (ECharts), FileUploader, Rating, Sidebar, Toast, Breadcrumbs, Tooltip, rich-text Editor, icons.
- `shared/components`: DocListPage, ViewControls, Filter, SortBy, GroupBy, ColumnSettings, ConditionsFilter, ListViews/* (DocListView, genericListConfig, EmptyState), Kanban, FieldLayout/*, FieldLayoutEditor, SidePanelLayout, QuickEntryModal, CreateDocumentModal, Controls/* (Link, Grid, GridCell, Attach, Duration, RatingInput, TableMultiselect, TextEditor, Geolocation, Html, ImageUploader ...), AssignTo, FilesUploader, DataImport, Settings/*, UserAvatar, CollapsibleSection, CustomActions.
- `shared/hooks`: useDocument, useMeta, useViewController, useViews, useUserSettings, useListBulkActions, useFilterableFields, useFormScriptActions, useUnsavedChangesWarning, useUndoHistory, useKeyboardShortcuts, useSession, useUsers ...
- `shared/data/script.ts` (`registerDoctypeScripts`): the client-script engine that replaces Frappe's `frm.events` / `frappe.ui.form.on`.
- `core/resources` (createResource / listResource / documentResource hooks), `core/api` (endpointRegistry, rpc, http), `core/modules` (module registry, `ModuleDefinition` with navigation, routes, settings, shell slots), `core/navigation`.
- Today these are wired to CRM doctypes. Your job is to GENERALISE them into doctype-agnostic Desk screens driven by the doctype meta, then reuse. Move generic code to `shared/`; never copy-paste a CRM component into another module.

## Backend you can call (already ported, verbatim Frappe code)
`/api/erpnext/method/<dotted.path>/` (GET/POST) and `/api/erpnext/resource/<DocType>/` (+ `/<name>/`), `/api/erpnext/doctype/<DocType>/meta/`, `/api/erpnext/doc/...` (create, submit, cancel). Key whitelisted methods (names as in Frappe): `frappe.desk.form.load.getdoctype`, `getdoc`, `get_docinfo`, `frappe.desk.form.save.savedocs`, `frappe.desk.form.save.cancel`, `frappe.desk.reportview.get`, `get_count`, `export_query`, `save_report`, `get_list_settings` / `set_list_settings`, `frappe.desk.listview.*`, `frappe.desk.search.search_link`, `search_widget`, `frappe.desk.desktop.get_workspaces`, `get_desktop_page`, `frappe.desk.query_report.run`, `export_query`, `frappe.desk.form.assign_to.*`, `frappe.desk.like.toggle_like`, `frappe.desk.form.document_follow.*`, `frappe.desk.form.linked_with.get`, `frappe.desk.notifications.*`, `frappe.client.*`, `frappe.model.workflow.get_transitions` / `apply_workflow`, `frappe.model.mapper.make_mapped_doc`, `frappe.desk.doctype.number_card.number_card.*`, `frappe.desk.doctype.dashboard_chart.dashboard_chart.get`, `frappe.core.doctype.data_import.*`, `frappe.utils.print_format.download_pdf`, `frappe.desk.form.utils.*`. HRMS methods are under `hrms.*` (the backend already allows the `hrms` prefix).
If a method the original UI calls is missing or behaves differently, do not rewrite it: port the upstream function text from `vendor/frappe/frappe` / `vendor/erpnext/erpnext` / `vendor/hrms/hrms` using the scripts in `backend/scripts/` (`port_controller.py`, `replace_functions.py`, `extract_functions.py`), add a backend test, and note it in `docs/codex_handoff.md`.

## The original UI source (read it, file by file)
Frappe's desk is jQuery/vanilla JS. Read these and reproduce layout, copy, behaviour and edge cases:
- `vendor/frappe/frappe/public/js/frappe/list/*` (list_view, base_list, bulk_operations, list_settings, list_filter, list_sidebar_group_by, list_view_select)
- `vendor/frappe/frappe/public/js/frappe/views/*` (reportview, kanban, calendar, gantt, image, dashboard, inbox, treeview, workspace, factory, breadcrumbs)
- `vendor/frappe/frappe/public/js/frappe/form/*` (form, layout, section, column, tab, toolbar, footer, sidebar, grid, grid_row, controls/*, dashboard, linked_with, workflow, save, script_manager, quick_entry, undo_manager, timeline, templates)
- `vendor/frappe/frappe/public/js/frappe/ui/*`, `desk.js`, `router.js`, `search`, `toolbar` (awesomebar / global search / notifications)
- `vendor/frappe/frappe/public/scss/desk/*` for the visual language
- HR client scripts: `vendor/hrms/hrms/public/js/**` (employee, leave application, salary slip, payroll entry, hierarchy chart, interview, performance bundle, ...) and every `*.js` next to a doctype in `vendor/hrms/hrms/**/doctype/*/` (these are the form scripts: buttons, filters, field behaviour). Port them through `registerDoctypeScripts` exactly like `modules/crm/doctypes/*/*.ts`.
- ERPNext doctype scripts: `vendor/erpnext/erpnext/**/doctype/*/*.js` (same mechanism; do these after HR, per module, in priority order Accounts, Stock, Selling, Buying).

## Deliverables

### A. Shell + one sidebar (one menu, all modules)
- The module rail and sidebar already exist (`app/components/ModuleRail.tsx`, `AppSidebar.tsx`). Make every ported Frappe module appear as a module in the rail/sidebar: Accounts, Buying, Selling, Stock, Assets, Projects, Support, Manufacturing, HR (+ Payroll, Leaves, Recruitment ...), CRM, Setup. Sidebar sections/items come from the ported workspace data (`frappe.desk.desktop.get_workspaces` + `get_desktop_page`, backed by the Workspace / Workspace Sidebar JSON in `backend/apps/*/*/workspace/`), exactly as Frappe shows them (shortcuts, link cards, number cards, charts, onboarding). Respect permissions and hidden modules.
- The employee self-service pages (`modules/hrms/pages/*`, built under the other prompt) become entries of the HR section of the SAME sidebar (e.g. "My Attendance", "My Leaves", "My Expenses", "My Payslips") next to the manager workspaces. One HR menu, not two apps.
- Global search (awesomebar) with doctype/report/page results, recent items, keyboard shortcut; notifications bell with the real notification log; breadcrumbs; "new" quick-create; user menu (already exists).

### B. Generic Desk screens (in `shared/` + routes in `core`/`app`)
Routes: `/app/:doctype` (list), `/app/:doctype/view/:view` (report / kanban / calendar / gantt / image / inbox / tree / dashboard), `/app/:doctype/new`, `/app/:doctype/:name`, `/app/query-report/:report`, `/app/<workspace>`, `/app/dashboard-view/:name`. Keep the same URL shapes as Frappe so doc links in emails and the data work.
1. **List view**: standard filters bar, filter popover (conditions, saved filters), sort, group-by sidebar with counts, tags, assigned-to / liked / "my" filters, list settings (fields, row count, disable count/sidebar), bulk actions (assign, delete, edit, export, print, add tag, submit/cancel), pagination / load more, indicators (status colours), subject, comment/like counts, "Refresh", "Menu" (user settings, import, export, customise), saved views (reuse `useViews`), permission-restricted notices, empty states with the doctype's own copy.
2. **Report view** (grid with column picker, group-by, totals, inline edit, export) and **Script/Query Reports** (`frappe.desk.query_report.run`, filters from the report definition incl. dynamic Link filters, chart, report summary, totals row, tree reports, prepared reports, export, "Set as default", add to dashboard, print).
3. **Form view**: layout engine honouring tabs / sections / columns / collapsible / depends_on / mandatory_depends_on / read_only_depends_on / hidden / permlevels / `fetch_from`; all field controls (Data, Link with search + quick create, Dynamic Link, Select, Check, Int/Float/Currency/Percent with precision and number format, Date/Datetime/Time/Duration, Text/Small Text/Long Text/Text Editor/Markdown/HTML/Code/JSON, Attach/Attach Image/Signature/Barcode/Geolocation/Rating/Color/Icon/Autocomplete/Password/Phone, Table + Table MultiSelect grids with row editing, bulk edit, duplicate row, upload/download CSV); toolbar (Save, Submit, Cancel, Amend, Duplicate, Rename, Print, Email, Links, Reload, Delete, Undo/Redo, Jump to field, Customise form, Print settings), docstatus pills and indicators, "Not Saved", unsaved-changes guard, dirty tracking, optimistic concurrency (timestamp mismatch dialog), form sidebar (assigned to, attachments, share, tags, follow, like, reviews, "Created/Modified by", print/email counts), connections dashboard (linked doc counts + create from here, from `get_meta` dashboard data and `*_dashboard.py`), timeline (comments with the rich-text editor and mentions, versions/field-change diffs, communications/emails, assignments, attachments, workflow states, info), workflow action buttons and states (`frappe.model.workflow`), "Create" menu from `make_mapped_doc` mappers, document naming (prompt / series), amend flow, previous/next navigation, quick entry for Link-field creation, form tours.
4. **Other views**: Kanban (reuse `shared/components/Kanban`), Calendar, Gantt, Image, Tree (Chart of Accounts, Cost Center, Item Group, Department ...), Dashboard view with number cards + charts, Inbox where relevant.
5. **Workspace pages**: render workspace blocks (header, paragraph, shortcut, card/link groups, number card, chart, onboarding, spacer) with the same layout as Frappe 16 desk; customise mode if the data supports it.
6. **Settings screens** for the single doctypes (HR Settings, Payroll Settings, Accounts Settings, Stock Settings, System Settings ...) via the generic form.
7. **Print / PDF**: print preview using the ported print formats (`frappe.www.printview`, `utils.print_format`), download PDF, email dialog.
8. **Data import/export** (reuse `shared/components/DataImport`), bulk update, rename, merge, and the audit/permission screens (role permission manager, user permissions) as far as the ported backend supports.

### C. HR manager functionality (modules/hrms + the Desk above)
Deliver everything an HR manager does in Frappe HR, through Desk screens + the original form scripts + custom pages:
- **HR Setup**: Employee (full form: personal, joining, address, attendance & leave, salary, health, exit, connections), Employee Group/Grade/Type, Department, Designation, Branch, Holiday List, HR Settings, Employee Onboarding/Separation templates and activities, Employee Promotion/Transfer, Employee Referral, Staffing Plan.
- **Leaves**: Leave Type, Leave Policy (+ Assignment, Grant), Leave Period, Leave Allocation, Leave Application (approval flow, balance panel, half-day, LWP), Leave Encashment, Compensatory Leave Request, Leave Ledger, Leave Control Panel (bulk allocation tool).
- **Shift & Attendance**: Shift Type, Shift Assignment (+ tool), Shift Request, Attendance (+ bulk marking tool and Monthly Attendance Sheet report), Attendance Request, Employee Checkin (+ log reconciliation), Upload Attendance, Employee Attendance Tool.
- **Expenses**: Expense Claim (+ Type, advances, approvals, payment entry creation), Employee Advance, Travel Request/Itinerary, Vehicle Log.
- **Payroll**: Salary Component, Salary Structure (+ Assignment, Assignment tool), Payroll Period, Payroll Entry (the full process: filters, employees, create salary slips, submit, bank entry), Salary Slip (earnings/deductions tables, timesheet, tax calculation, Kenya payroll pieces already in backend), Additional Salary, Retention Bonus, Employee Incentive, Employee Benefit Application/Claim, Income Tax Slab, Tax Exemption declarations and proofs, Salary Withholding, Full and Final Statement, Gratuity (+ Rule), Payroll Settings, and the reports (Salary Register, Bank Remittance, Income Tax Computation, Accrued Earnings, Salary Payments by mode, Employee CTC break-up ...).
- **Recruitment**: Job Requisition, Job Opening, Job Applicant (+ Source), Interview (+ Round, Type, Feedback), Job Offer, Appointment Letter (+ Template), Offer Term, Applicant kanban pipeline.
- **Performance & Growth**: Appraisal Cycle, Appraisal (+ Template, KRA, Goal with tree view), Employee Performance Feedback (+ Criteria), Employee Skill Map, Training Program/Event/Result/Feedback.
- **Lifecycle & misc**: Employee Checkin map, Daily Work Summary (+ Group), Employee Property/Asset handover hooks, Identification documents.
- **HR custom pages**: the Org Chart / Hierarchy Chart (`public/js/hierarchy-chart`, `hierarchy_chart/`), the Roster page (`vendor/hrms/roster`, shared with the employee-app prompt), the HR dashboards (workspace number cards/charts), Performance bundle widgets, Interview feedback UI.
- **HR reports**: every report in `vendor/hrms/hrms/**/report/*` (with its `.js` filters) via the generic Script Report screen.
Keep each doctype's original form script behaviour (buttons, filters, default values, validations, dashboards) via `modules/hrms/doctypes/<doctype>/<doctype>.ts` registered with `registerDoctypeScripts`.

## Engineering rules (non-negotiable)
- **No code comments or docstrings. No eslint-disable / ts-ignore directives.**
- React 19 + TypeScript strict (`noUncheckedIndexedAccess`), React Compiler lint rules on (no ref reads/writes in render, no setState in effects, use `useEffectEvent`).
- Layers (ESLint boundaries enforced): modules never import modules; `core` / `design-system` / `shared` never import upward. Generic -> `shared/`; HR-only -> `modules/hrms/`. Never copy a component between modules.
- Files: flat, one component per file, PascalCase `.tsx`; hooks in `hooks/`, stores (zustand) in `stores/`, helpers in `utils/`, types in `types/`. Prettier (no semicolons, single quotes, width 120). Tailwind 4 classes only. `__()` for every string. Icons via `LucideIcon` or the `lucide-*` classes.
- Write files UTF-8 without BOM. Latest stable versions of dependencies only; add a dependency only if nothing existing does the job.
- Tests (Vitest + Testing Library) for every shared screen and hook (loading, empty, error, permission, success) and for the form-script behaviours you port; follow `modules/crm/tests` and `shared/tests`.
- Never run `git commit/push/checkout/reset`; never delete files you did not create.
- Do not touch: `backend/apps/frappe/runtime.py`, `backend/apps/frappe/model/*`, `backend/apps/frappe/database/*`, `backend/apps/frappe/__init__.py`, `backend/apps/erpnext/install.py`. If the backend needs a change there, log the failing call and the proposed fix in `docs/codex_handoff.md`.
- Backend gaps: port upstream function text with `backend/scripts/*`, never hand-write replacements; add a test; list it in `docs/codex_handoff.md`.

## Definition of done (per slice)
1. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all pass in `frontend/`.
2. Side-by-side with the original JS source: structure, copy, behaviour and edge cases match; list every intentional difference.
3. The screen works for at least two unrelated doctypes (e.g. Employee and Sales Invoice) to prove it is generic.
4. Report: files added/changed, components reused vs created (with reason), commands run and results.

## Order of work (finish and verify each step before the next)
1. Doctype-agnostic list view: generalise `DocListPage` / `useViewController` / filters / group-by / list settings off the CRM doctypes; route `/app/:doctype`. Prove with Employee, Leave Application and Sales Invoice.
2. Generic form view: layout engine, all controls, grids, toolbar, docstatus, save/submit/cancel/amend, unsaved guard. Prove with Employee, Salary Slip, Sales Invoice.
3. Form sidebar, connections dashboard, timeline (comments, versions, communications, assignments), workflow, mapped "Create" menu.
4. Workspaces + one sidebar for all modules + global search + notifications.
5. Report view + Script Reports + dashboards (number cards, charts).
6. Kanban / Calendar / Gantt / Tree / Image views.
7. HR Setup + Leaves doctype scripts and screens, then Shift & Attendance, then Expenses.
8. Payroll (Payroll Entry process, Salary Structure/Assignment tools, Salary Slip, tax) and its reports.
9. Recruitment, Performance, Training; Org Chart, Roster, Interview and performance widgets.
10. Print/PDF/email, data import/export, settings singles.
11. Polish pass: dark mode, mobile + desktop, accessibility, tests, review against the original JS.
12. Then repeat the doctype scripts for Accounts, Stock, Selling, Buying using the same Desk layer.

Start with steps 1 and 2, report results, then continue. Follow what `modules/crm` does whenever a choice is open; ask only if blocked.
