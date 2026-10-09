# Codex prompt: HRMS frontend (React port of Frappe HR's Vue apps)

Paste everything below the line into Codex.

---

You are porting the Frappe HRMS frontends from Vue to React inside the BBS-ERP monorepo.
Repo: `D:\Clients\BBS-ERP`. React app: `frontend/`. Reference (read-only): `vendor/hrms/frontend` (employee self-service app, Vue 3 + Ionic), `vendor/hrms/roster` (shift roster, Vue 3), `vendor/hrms/frappe-ui` (the component library both depend on).

## Product bar
This is an enterprise application for a high-end shopping mall. Every screen must feel premium: pixel-faithful to the original Frappe HR UI, consistent with the CRM we already ported, polished spacing, real loading / empty / error states, keyboard and screen-reader support, responsive from phone to wide desktop. No placeholders, no "TODO", no stubbed screens, no simplified versions. If the original has a behaviour, port it.

## Precedent: how we ported CRM (do it the same way)
CRM was a Vue app (frappe-ui). We rebuilt it in React + TypeScript with the same look, behaviour and feel. The old Vue source is kept as the behavioural reference. We did not run the Vue app; we read its source and mapped it exactly. Do the same: read `vendor/hrms/frontend/src/**` and `vendor/hrms/roster/src/**` file by file and reproduce layout, copy, icons, spacing, colours, interactions, validation and empty states.

## Where code goes (the structure is fixed)
```
frontend/src/
  app/            bootstrap, shell, router wiring (modules registered in app/modules.ts)
  core/           api (endpointRegistry, rpc, http), resources, auth, i18n, navigation, modules registry
  design-system/  primitives (Button, Dialog, Dropdown, ListView, Tabs, FormControl, DatePicker, Charts, Sidebar ...) and theme
  shared/         components/hooks/stores reused across modules (DocListPage, ViewControls, Filter, SortBy, Settings, Controls, FieldLayout, Kanban, FilesUploader, AssignTo, ...)
  modules/<name>/ module code; hrms goes in modules/hrms/
```
Create `frontend/src/modules/hrms/` mirroring `modules/crm/`:
`module.ts` (a `ModuleDefinition`: id `hrms`, label `HR`, icon, endpoints, routes, guards, navigation, settings, shell), `api/endpoints.ts`, `routes.ts`, `navigation.ts`, `guards.ts`, `pages/`, `components/`, `hooks/`, `stores/`, `types/`, `utils/`, `styles/`, `tests/`. Register it in `frontend/src/app/modules.ts` next to `crmModule`.

Rules enforced by ESLint boundaries: modules never import other modules; core/design-system/shared never import upward. If something is generic and needed by more than one module, put it in `shared/` (generic) and keep only HR-domain code in `modules/hrms/`.

## REUSE FIRST. Do not rebuild what exists.
Before writing any component, search `frontend/src/design-system` and `frontend/src/shared` and `frontend/src/modules/crm/components`. Use what is there:
- Primitives from `@/design-system`: Button, Badge, Avatar, Alert, Dialog (+ createDialog/confirmDialog), Dropdown, Popover, Tooltip, Toast, Tabs, TabButtons, Breadcrumbs, Switch, Checkbox, TextInput, Textarea, Select, Combobox, MultiSelect, DatePicker / DateTime / DateRange / TimePicker, FormControl, ListView family, Charts (ECharts), FileUploader, Rating, CircularProgressBar, Sidebar, Spinner, ErrorMessage, KeyboardShortcut, Duration.
- Shared: DocListPage, ViewControls, Filter, SortBy, GroupBy, ColumnSettings, Controls/*, FieldLayout/*, SidePanelLayout, CreateDocumentModal, QuickEntryModal, FilesUploader, AssignTo, UserAvatar, MultipleAvatar, CollapsibleSection, Settings/*, Kanban, EmptyState-style components, hooks (`useDocument`, `useMeta`, `useUsers`, `useSession`, `useViewController`, `useUserSettings`, `useIsMobileView`, `useKeyboardShortcuts`, ...), and the resources layer in `core/resources` (`createResource`/`listResource`/`documentResource` hooks) which replaces frappe-ui's `createResource`/`createListResource`.
- Only create a new component when nothing existing fits, and then put it in the right layer (generic -> `shared/components`, HR-only -> `modules/hrms/components`).
- Ionic components in the Vue app (IonPage, IonModal, IonActionSheet, IonTabs, IonRefresher, IonInfiniteScroll, IonDatetime, ...) must be re-expressed with our design-system parts (Dialog / sheet, Tabs, Dropdown, DatePicker) while keeping the same look and behaviour. Do not add Ionic or Vue.
- Mobile behaviour: the HR app is mobile-first (bottom tabs, action sheets, pull-to-refresh feel). Reproduce that on small screens using `useIsMobileView` and the same shell mechanisms CRM uses for its mobile layout; on desktop it must also look intentional (the shell sidebar, not a stretched phone layout).

## Scope: port all of it
**Employee app (`vendor/hrms/frontend/src`)** - routes: Home, Attendance dashboard, Leaves dashboard, Expense Claims dashboard, Salary Slips dashboard, Login, Forgot password, Profile, Notifications, Settings, Change password, Invalid employee. Views: `attendance/` (AttendanceRequest list+form, EmployeeCheckin list, ShiftAssignment list+form, ShiftRequest list+form, Dashboard), `employee_advance/`, `expense_claim/` (dashboard, form, list), `leave/` (dashboard, form, list), `salary_slip/` (dashboard, detail). All components in `src/components` (CheckInPanel, AttendanceCalendar, LeaveBalance, Holidays, ExpenseItems/Taxes/Advances tables, SalaryDetailTable, SemicircleChart, RequestList/RequestPanel, WorkflowActionSheet, FormView/FormField/Link, ListView, ListFiltersActionSheet, QuickLinks, ProfileInfoModal, FilePreviewModal, FileUploaderView, EmptyState, BottomTabs, ...), the `data/` resources (session, user, employee, leaves, claims, advances, attendance, notifications, settings, currencies), composables (realtime, workflow, currency conversion), utils (formatters, dayjs, dialogs, push notifications) and the 20+ icons.
**Roster (`vendor/hrms/roster/src`)** - Home, MonthView (header + table), ShiftAssignmentDialog, NavBar, Link.

## API layer
- Declare endpoints in `modules/hrms/api/endpoints.ts` with `ModuleEndpoints` helpers (`get`/`post`), exactly like `modules/crm/api/endpoints.ts`. The browser reaches the backend at `/api/...` (Vite proxies to Django in dev; nginx in production).
- Generic Frappe calls go through `/api/erpnext/method/<dotted.path>/` and `/api/erpnext/resource/<DocType>/` (see `backend/apps/erpnext/api.py`, `views.py`). HR methods live in `vendor/hrms/hrms/api/__init__.py` and the doctype controllers. The backend's `METHOD_PREFIXES` currently only allows `frappe` and `erpnext`; HRMS methods need `hrms` allowed there. That is a small backend change: make it, add a test in `backend/apps/erpnext/tests/test_rest_contract.py`, and tell me. Do not edit the files listed under "Do not touch".
- Auth is JWT (`/api/auth/token/` with `email` + `password`). Reuse `core/auth` and `useSession`; do not write another login stack. The HR Login screen should match the original's look while using our auth.
- Do not invent endpoints. If a method the Vue app calls does not exist in the backend, check `backend/apps/hrms` and `vendor/hrms/hrms`; if it truly is missing, write it in the backend by porting the upstream function text (we port Frappe code verbatim with the scripts in `backend/scripts/`, never rewrite it).

## Visual fidelity
- Match the original: same colours (use the Tailwind 4 theme tokens already generated in `design-system/styles/theme.css`), radii, type scale, icon choices (lucide / feather as the original used), spacing, hover and focus states, animations, empty-state illustrations/copy, toast and dialog wording.
- Icons: use `LucideIcon` / the `lucide-*` classes (now generated by the Iconify plugin) or the shared Icons; do not paste ad-hoc SVGs unless the original does.
- Every string goes through `__()` from `@/core/i18n`.
- Dark mode must work (the theme switcher exists in the user menu).
- Accessibility: roles, labels, focus management in dialogs/sheets, keyboard operation.

## Engineering rules (non-negotiable)
- **No code comments or docstrings at all. No eslint-disable / ts-ignore directives.**
- React 19 + TypeScript strict (`noUncheckedIndexedAccess` is on). The React Compiler lint rules are on: no ref reads/writes during render, no setState in effects, use `useEffectEvent` and render-phase derived state where needed.
- Files: flat, one component per file, PascalCase `.tsx`; hooks `useX.ts` in `hooks/`; stores in `stores/` (zustand); pure helpers in `utils/`; types in `types/`. Keep folders for genuinely multi-file components only. Prefer the existing `shared/` component over a new one.
- Style: Prettier config in the repo (no semicolons, single quotes, width 120). Tailwind 4 classes only (`border-(--var)`, `ring-black/5`, `placeholder:text-...`).
- Write files with the Write/Edit tools or UTF-8 **without BOM**.
- Tests: add Vitest + Testing Library tests under `modules/hrms/tests/` for utils, hooks, stores and each page's main flows (loading, empty, error, success, permission). Follow the patterns in `modules/crm/tests/`.
- Never run `git commit`, `git push`, `git checkout`, `git reset`, or delete files you did not create.

## Do not touch (owned by another engineer, currently in flux)
`backend/apps/frappe/runtime.py`, `backend/apps/frappe/model/*`, `backend/apps/frappe/database/*`, `backend/apps/frappe/__init__.py`, `backend/apps/erpnext/install.py`. If a fix needs those, append the failing case and your proposed change to `docs/codex_handoff.md` instead.

## Definition of done (per slice)
1. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all pass in `frontend/`.
2. The screen matches the original in structure and behaviour; list any intentional difference.
3. No duplicate of an existing design-system/shared component was created.
4. Report: files added/changed, components reused vs created (with reason), commands run and their results.

## Order of work (finish and verify each before the next)
1. Module skeleton: `modules/hrms` (module.ts, endpoints, routes, navigation, guards), registered in `app/modules.ts`, backend `hrms` method prefix + test.
2. Shared plumbing: session/employee/settings stores and hooks (port `data/*.js`), formatters, realtime, workflow action sheet, currency conversion.
3. Layout pieces: bottom tabs, base layout, request list/panel, form view and form fields, list view, filters sheet, empty state.
4. Home + Attendance (check-in panel, calendar, dashboard, requests, shifts).
5. Leaves.
6. Expense claims + Employee advances.
7. Salary slips.
8. Profile, notifications, settings, change password, forgot password, invalid employee.
9. Roster app (month view, shift assignment dialog).
10. Polish pass: dark mode, mobile + desktop, accessibility, tests, side-by-side review against the Vue source.

Start with step 1 and 2, report, then continue. Ask nothing unless blocked; when a choice is open, follow what `modules/crm` does.
