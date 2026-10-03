// The one place that bridges frappe-ui's resource primitives (createResource /
// createListResource / createDocumentResource, used unmodified from the
// `frappe-ui` package) to this project's Django REST backend.
//
// createResource/createListResource always call a single pluggable
// `resourceFetcher(options)` with Frappe RPC-shaped `options.url` +
// `options.params` (see node_modules/frappe-ui/src/resources/{resources,listResource}.js)
// regardless of what operation they represent. This fetcher recognizes the
// small fixed set of virtual method names they use as defaults
// (frappe.client.get_list/insert/set_value/delete, run_doc_method) and
// translates each into a real REST call; anything else is treated as a
// literal path under /api/crm/.
import { setConfig } from 'frappe-ui'
import { authStore } from './stores/auth'

const DOCTYPE_ENDPOINTS = {
  'CRM Lead': 'crm/leads',
  'CRM Deal': 'crm/deals',
  'CRM Task': 'crm/tasks',
  'FCRM Note': 'crm/notes',
  'CRM Call Log': 'crm/call-logs',
  'CRM Lead Status': 'crm/lead-statuses',
  'CRM Deal Status': 'crm/deal-statuses',
  'CRM Communication Status': 'crm/communication-statuses',
  'Comment': 'crm/comments',
  'CRM Form Script': 'crm/form-scripts',
  'Salutation': 'crm/salutations',
  'Gender': 'crm/genders',
  'Address': 'crm/addresses',
  'Contact': 'crm/contacts',
  'CRM Organization': 'crm/organizations',
  'User': 'crm/users',
  'Assignment Rule': 'crm/assignment-rules',
  'CRM Service Level Agreement': 'crm/sla-policies',
  'CRM Holiday List': 'crm/holiday-lists',
  'Automation Flow': 'crm/automation-flows',
  'Background Task': 'crm/background-tasks',
  
  // Custom Modules
  'Mall': 'property/malls',
  'Building': 'property/buildings',
  'Floor': 'property/floors',
  'Unit': 'property/units',
  
  'Tenant': 'leasing/tenants',
  'Lease': 'leasing/leases',
  'Lease Document': 'leasing/lease-documents',
  
  'Company': 'accounting/companies',
  'Account': 'accounting/accounts',
  'Sales Invoice': 'accounting/sales-invoices',
  'Sales Invoice Item': 'accounting/sales-invoice-items',
  'Payment Entry': 'accounting/payment-entries',
  'Payment Entry Reference': 'accounting/payment-entry-references',
  'GL Entry': 'accounting/gl-entries',
  
  'Mpesa Settings': 'payments/mpesa-settings',
  'Mpesa Transaction': 'payments/mpesa-transactions',
  
  'IoT Gateway': 'iot/gateways',
  'IoT Device': 'iot/devices',
  'Registered Vehicle': 'iot/vehicles',
  'Parking Session': 'iot/parking-sessions',
  'Security Event': 'iot/security-events',
  
  // Helpdesk Modules
  'HD Ticket': 'helpdesk/tickets',
  'HD Customer': 'helpdesk/customers',
  'HD Agent': 'helpdesk/agents',
  'HD Team': 'helpdesk/teams',
  'HD Article': 'helpdesk/articles',
  'HD Article Category': 'helpdesk/article-categories',
  'HD Ticket Status': 'helpdesk/ticket-statuses',
  'HD Ticket Priority': 'helpdesk/ticket-priorities',
  'HD Ticket Type': 'helpdesk/ticket-types',
  'HD Service Level Agreement': 'helpdesk/sla-policies',
  'HD Settings': 'helpdesk/settings',
}

function endpointFor(doctype) {
  const base = DOCTYPE_ENDPOINTS[doctype]
  if (!base) throw new Error(`No REST endpoint mapped for doctype "${doctype}"`)
  return `/api/${base}/`
}

// The original's whitelisted Python method names (crm.api.doc.*,
// crm.fcrm.doctype.crm_view_settings.crm_view_settings.*, plus a couple of
// core frappe.* ones ViewControls/its dependents call directly via `call()`)
// mapped onto this backend's real REST endpoints -- see apps/crm/doc_views.py
// and apps/crm/urls.py.
const METHOD_ENDPOINTS = {
  'crm.api.doc.get_data': { path: '/api/crm/doc/get-data/', method: 'POST' },
  'frappe.automation_engine.api.get_automation_capabilities': { path: '/api/crm/automation-capabilities/', method: 'GET' },
  'frappe.automation_engine.api.validate_action_params': { path: '/api/crm/automation-validate-params/', method: 'POST' },
  'frappe.automation_engine.api.get_param_options': { path: '/api/crm/automation-param-options/', method: 'POST' },
  'frappe.automation_engine.api.run_manually': { path: '/api/crm/automation-run-manually/', method: 'POST' },
  'frappe.automation_engine.api.trial_run': { path: '/api/crm/automation-trial-run/', method: 'POST' },
  'frappe.automation_engine.api.get_runs': { path: '/api/crm/automation-runs/', method: 'GET' },
  'frappe.client.rename_doc': { path: '/api/crm/doc/rename/', method: 'POST' },
  'crm.api.doc.sort_options': { path: '/api/crm/doc/sort-options/', method: 'GET' },
  'crm.api.doc.get_filterable_fields': { path: '/api/crm/doc/filterable-fields/', method: 'GET' },
  'crm.api.doc.get_group_by_fields': { path: '/api/crm/doc/group-by-fields/', method: 'GET' },
  'crm.api.doc.get_quick_filters': { path: '/api/crm/doc/quick-filters/', method: 'GET' },
  'crm.api.doc.update_quick_filters': { path: '/api/crm/doc/quick-filters/update/', method: 'POST' },
  'crm.api.doc.get_assigned_users': { path: '/api/crm/doc/assigned-users/', method: 'GET' },
  'crm.api.doc.add_seen': { path: '/api/crm/doc/add-seen/', method: 'POST' },
  'crm.api.doc.get_fields': { path: '/api/crm/doc/fields/', method: 'GET' },
  'crm.fcrm.doctype.crm_view_settings.crm_view_settings.create': { path: '/api/crm/views/create/', method: 'POST' },
  'crm.fcrm.doctype.crm_view_settings.crm_view_settings.update': { path: '/api/crm/views/update/', method: 'POST' },
  'crm.fcrm.doctype.crm_view_settings.crm_view_settings.delete': { path: '/api/crm/views/delete/', method: 'POST' },
  'crm.fcrm.doctype.crm_view_settings.crm_view_settings.public': { path: '/api/crm/views/public/', method: 'POST' },
  'crm.fcrm.doctype.crm_view_settings.crm_view_settings.pin': { path: '/api/crm/views/pin/', method: 'POST' },
  'crm.fcrm.doctype.crm_view_settings.crm_view_settings.create_or_update_standard_view': {
    path: '/api/crm/views/standard/', method: 'POST',
  },
  'crm.fcrm.doctype.crm_view_settings.crm_view_settings.set_as_default': {
    path: '/api/crm/views/set-default/', method: 'POST',
  },
  'crm.fcrm.doctype.crm_view_settings.crm_view_settings.fetch_and_update_kanban_columns': {
    path: '/api/crm/views/kanban-columns/', method: 'POST',
  },
  'frappe.desk.like.toggle_like': { path: '/api/crm/doc/toggle-like/', method: 'POST' },
  'crm.api.session.get_users': { path: '/api/crm/session/users/', method: 'GET' },
  'crm.api.session.get_user_info': { path: '/api/crm/session/user-info/', method: 'POST' },
  'crm.api.session.get_organizations': { path: '/api/crm/session/organizations/', method: 'GET' },
  'crm.www.crm.get_context_for_dev': { path: '/api/crm/session/boot/', method: 'GET' },
  // crm/api/views.py's get_views(doctype) -- distinct from doc_api.get_views,
  // which is called with a user for permission-scoping. Both wrap the same
  // CRMViewSettings query; the views.py entrypoint has no user param, so the
  // GET endpoint infers it from the authenticated request instead.
  'crm.api.views.get_views': { path: '/api/crm/doc/views/', method: 'GET' },
  // Link.vue's autocomplete search -- the one RPC name every Link field in
  // the app calls, regardless of which doctype it's searching.
  'frappe.desk.search.search_link': { path: '/api/crm/doc/search-link/', method: 'POST' },
  'crm.integrations.api.is_call_integration_enabled': { path: '/api/crm/telephony/status/', method: 'GET' },
  'frappe.client.get_doc_permissions': { path: '/api/crm/doc/permissions/', method: 'GET' },
  'frappe.client.get_value': { path: '/api/crm/doc/get-value/', method: 'POST' },
  'crm.api.whatsapp.is_whatsapp_enabled': { path: '/api/crm/integrations/whatsapp/enabled/', method: 'GET' },
  'crm.api.whatsapp.is_whatsapp_installed': { path: '/api/crm/integrations/whatsapp/installed/', method: 'GET' },
  'crm.api.contact.search_emails': { path: '/api/crm/search-emails/', method: 'POST' },
  'crm.api.contact.get_linked_deals': { path: '/api/crm/contact-linked-deals/', method: 'POST' },
  'crm.api.contact.create_new': { path: '/api/crm/contact-create-new/', method: 'POST' },
  'crm.api.contact.set_as_primary': { path: '/api/crm/contact-set-primary/', method: 'POST' },
  'frappe.core.doctype.user.user.get_timezones': { path: '/api/crm/user-timezones/', method: 'GET' },
  'crm.api.assignment_rule.get_assignment_rules_list': { path: '/api/crm/assignment-rules-list/', method: 'GET' },
  'crm.api.assignment_rule.duplicate_assignment_rule': { path: '/api/crm/assignment-rules-duplicate/', method: 'POST' },
  'crm.api.notifications.get_notifications': { path: '/api/crm/notifications/', method: 'GET' },
  'crm.api.notifications.mark_as_read': { path: '/api/crm/notifications/mark-read/', method: 'POST' },
  'crm.api.delete_attachment': { path: '/api/crm/doc/delete-attachment/', method: 'POST' },
  'crm.api.get_file_uploader_defaults': { path: '/api/crm/doc/file-uploader-defaults/', method: 'GET' },
  'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout': { path: '/api/crm/fields-layout/', method: 'GET' },
  'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.save_fields_layout': { path: '/api/crm/fields-layout/save/', method: 'POST' },
  'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_sidepanel_sections': { path: '/api/crm/fields-layout/sidepanel/', method: 'GET' },
  'crm.api.doc.remove_assignments': { path: '/api/crm/doc/assign-to/remove/', method: 'POST' },
  'frappe.desk.form.assign_to.add': { path: '/api/crm/doc/assign-to/add/', method: 'POST' },
  'frappe.desk.form.assign_to.add_multiple': { path: '/api/crm/doc/assign-to/add-multiple/', method: 'POST' },
  'frappe.desk.form.assign_to.remove_multiple': { path: '/api/crm/doc/assign-to/remove-multiple/', method: 'POST' },
  'frappe.desk.doctype.bulk_update.bulk_update.submit_cancel_or_update_docs': { path: '/api/crm/doc/bulk-update/', method: 'POST' },
  'crm.api.doc.get_linked_docs_of_document': { path: '/api/crm/doc/linked-docs/', method: 'GET' },
  'crm.api.doc.remove_linked_doc_reference': { path: '/api/crm/doc/remove-linked-doc-reference/', method: 'POST' },
  'crm.api.doc.delete_bulk_docs': { path: '/api/crm/doc/delete-bulk/', method: 'POST' },
  'crm.api.onboarding.get_first_lead': { path: '/api/crm/onboarding/first-lead/', method: 'GET' },
  'crm.api.onboarding.get_first_deal': { path: '/api/crm/onboarding/first-deal/', method: 'GET' },
  'frappe.onboarding.get_onboarding_status': { path: '/api/crm/onboarding/status/', method: 'GET' },
  'frappe.onboarding.update_user_onboarding_status': { path: '/api/crm/onboarding/status/update/', method: 'POST' },
  'frappe.apps.get_apps': { path: '/api/crm/apps/', method: 'GET' },
  'crm.api.activities.get_activities': { path: '/api/crm/activities/', method: 'GET' },
  'crm.api.comment.add_comment': { path: '/api/crm/add-comment/', method: 'POST' },
  'crm.api.get_user_signature': { path: '/api/crm/user-signature/', method: 'GET' },
  'crm.api.dashboard.get_chart_options': { path: '/api/crm/dashboard/chart-options/', method: 'GET' },
  'crm.api.dashboard.get_dashboard': { path: '/api/crm/dashboard/', method: 'GET' },
  'crm.api.dashboard.get_chart': { path: '/api/crm/dashboard/chart/', method: 'GET' },
  'crm.api.dashboard.reset_to_default': { path: '/api/crm/dashboard/reset/', method: 'POST' },
}

// Frappe filters: {field: value} or [[field, "=", value], ...]. Translated to
// django-filter query params (exact-match fields only, matching what each
// ViewSet's filterset_fields currently exposes).
function filtersToParams(filters) {
  const params = {}
  if (!filters) return params
  if (Array.isArray(filters)) {
    for (const f of filters) {
      if (Array.isArray(f) && f.length >= 3) params[f[0]] = f[2]
    }
  } else if (typeof filters === 'object') {
    for (const [key, value] of Object.entries(filters)) {
      params[key] = Array.isArray(value) ? value[value.length - 1] : value
    }
  }
  return params
}

function stripNulls(obj) {
  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null) out[key] = value
  }
  return out
}

// Frappe's order_by is "<field> asc" / "<field> desc" (or bare "<field>",
// which Frappe treats as ascending); Django's OrderingFilter wants "<field>"
// / "-<field>".
function orderByToOrdering(orderBy) {
  if (!orderBy) return undefined
  const [field, direction] = orderBy.trim().split(/\s+/)
  return direction && direction.toLowerCase() === 'desc' ? `-${field}` : field
}

async function httpJson(method, url, { params, body } = {}) {
  const qs = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      qs.set(key, value)
    }
  }
  const fullUrl = qs.toString() ? `${url}?${qs}` : url

  const auth = authStore()
  const headers = { 'Content-Type': 'application/json' }
  if (auth.accessToken) headers['Authorization'] = `Bearer ${auth.accessToken}`

  // DRF's request.data raises a 400 ("Expecting value") on a POST/PATCH/etc.
  // with no body at all -- unlike Frappe's handler, which treats a missing
  // body as an empty params dict. createResource sometimes calls through
  // before .update()/.reload() has set any params yet (body === undefined
  // here), so every body-carrying method always sends at least '{}'.
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const requestBody = hasBody ? JSON.stringify(body !== undefined ? body : {}) : undefined

  let response = await fetch(fullUrl, { method, headers, body: requestBody })

  if (response.status === 401 && auth.refreshToken) {
    const refreshed = await auth.tryRefresh()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${auth.accessToken}`
      response = await fetch(fullUrl, { method, headers, body: requestBody })
    }
  }

  const text = await response.text()
  // Non-JSON bodies happen on things like Django's DEBUG 404/500 HTML pages
  // (e.g. an unmapped literal-path fallback) -- parse defensively rather
  // than letting JSON.parse throw a raw SyntaxError that isn't shaped like
  // the {messages: [...]} callers expect.
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const error = new Error(
      (data && (data.detail || JSON.stringify(data))) || text.slice(0, 200) || `Request failed: ${response.status}`,
    )
    error.status = response.status
    error.messages = data?.detail ? [data.detail] : Object.values(data || {}).flat()
    throw error
  }
  return data
}

export async function djangoResourceFetcher(options) {
  const { url, params } = options

  const mapped = METHOD_ENDPOINTS[url]
  if (mapped) {
    return mapped.method === 'GET'
      ? httpJson('GET', mapped.path, { params })
      : httpJson(mapped.method, mapped.path, { body: params })
  }

  if (url === 'frappe.client.get_list') {
    const endpoint = endpointFor(params.doctype)
    const query = {
      ...filtersToParams(params.filters),
      limit: params.limit_page_length || params.limit || 20,
      offset: params.limit_start || params.start || 0,
      search: params.search || undefined,
      ordering: orderByToOrdering(params.order_by),
    }
    const data = await httpJson('GET', endpoint, { params: query })
    return data.results ?? data
  }

  // stores/meta.js's getMeta() -- Frappe's real doctype-meta RPC returns
  // {docs: [...every meta touched by this call, including child tables...],
  // user_settings: '<json>'}. We have one doctype's meta and no per-user
  // grid/list view settings persistence, so this adapts the existing
  // /api/meta/<doctype>/ endpoint's shape into that envelope rather than
  // building a second meta endpoint.
  if (url === 'frappe.desk.form.load.getdoctype') {
    const meta = await httpJson('GET', `/api/meta/${encodeURIComponent(params.doctype)}/`)
    return {
      docs: [{ name: params.doctype, doctype: 'DocType', translated_doctype: false, ...meta }],
      user_settings: '{}',
    }
  }

  // meta.js's saveUserSettings() persists per-user grid/list view column
  // preferences -- no Django equivalent exists (no per-user settings store),
  // so this is a no-op that still resolves so callers relying on the
  // returned resource's .then()/onSuccess don't hang or throw.
  if (url === 'frappe.model.utils.user_settings.save') {
    return null
  }

  // Already exposed as a ViewSet @action (apps/crm/doctype/lead/lead_views.py)
  // at a path keyed by the lead's name, which a static METHOD_ENDPOINTS entry
  // can't express.
  if (url === 'crm.fcrm.doctype.crm_lead.crm_lead.convert_to_deal') {
    return httpJson('POST', `/api/crm/leads/${encodeURIComponent(params.lead)}/convert-to-deal/`)
  }

  // Same reasoning -- a ViewSet @action keyed by the deal's name (apps/crm/doctype/deal/deal_views.py).
  if (url === 'crm.fcrm.doctype.crm_deal.api.get_deal_contacts') {
    return httpJson('GET', `/api/crm/deals/${encodeURIComponent(params.name)}/contacts/`)
  }

  // Same reasoning again -- ViewSet @actions keyed by the call log's id
  // (apps/crm/doctype/call_log/call_log_views.py).
  if (url === 'crm.fcrm.doctype.crm_call_log.crm_call_log.get_call_log') {
    return httpJson('GET', `/api/crm/call-logs/${encodeURIComponent(params.name)}/detail/`)
  }
  if (url === 'crm.fcrm.doctype.crm_call_log.crm_call_log.create_lead_from_call_log') {
    // call_log is sometimes the full call-log dict, sometimes just its id
    // (CallLogDetailModal.vue passes the dict) -- the id is all the URL needs.
    const callLogName = typeof params.call_log === 'object' ? params.call_log?.name : params.call_log
    return httpJson('POST', `/api/crm/call-logs/${encodeURIComponent(callLogName)}/create-lead/`, {
      body: { lead_details: params.lead_details },
    })
  }

  // Generic "read one field off a Single doctype" RPC. The only Single
  // doctype modeled here is FCRM Settings (see settings_views.py); any
  // other doctype falls through to undefined, same as a field that doesn't
  // exist on the response -- callers (e.g. router.js's persona-capture
  // check) already treat a missing/falsy value as "not set".
  if (url === 'frappe.client.get_single_value') {
    if (params.doctype !== 'FCRM Settings') return null
    const data = await httpJson('GET', '/api/crm/settings/')
    return data?.[params.field] ?? null
  }

  if (url === 'frappe.client.get') {
    // FCRM Settings and System Settings are Frappe "Single" doctypes (one
    // row, name == doctype name) -- modeled as Django singletons with a
    // fixed endpoint rather than a per-name REST resource (see
    // apps/crm/settings_views.py / apps/core/system_settings_views.py).
    if (params.doctype === 'FCRM Settings') {
      return httpJson('GET', '/api/crm/settings/')
    }
    if (params.doctype === 'System Settings') {
      return httpJson('GET', '/api/crm/system-settings/')
    }
    const endpoint = endpointFor(params.doctype)
    return httpJson('GET', `${endpoint}${params.name}/`)
  }

  if (url === 'frappe.client.insert') {
    const { doctype, ...values } = params.doc
    const endpoint = endpointFor(doctype)
    // A fresh doc's untouched optional fields are `null` (Vue's document
    // proxy default, not an explicit "clear this"), but DRF's auto-generated
    // serializer fields reject `null` for any plain CharField/TextField that
    // isn't also `null=True` on the model (blank=True alone only allows
    // empty string) -- every such field 400s with "may not be null" on
    // every single create, surfacing to the user as an opaque "Could not
    // create document". Omitting the key lets the field fall back to its
    // model default (empty string for CharField/TextField) instead.
    return httpJson('POST', endpoint, { body: stripNulls(values) })
  }

  // frappe.client.save -- doc.save() on a document the caller already has the full state of
  // (e.g. the Workflow Automation builder, which edits every field including the nested
  // `actions` array locally and writes the whole thing back in one call, unlike set_value's
  // partial-field PATCH). Routes to the ViewSet's full update() (PUT), not partial_update().
  if (url === 'frappe.client.save') {
    const { doctype, ...values } = params.doc
    const endpoint = endpointFor(doctype)
    return httpJson('PUT', `${endpoint}${values.name}/`, { body: stripNulls(values) })
  }

  if (url === 'frappe.client.set_value') {
    // Frappe's set_value supports two shapes: fieldname as a single field's
    // name (string) with a separate `value`, or fieldname as a
    // {field: value, ...} dict covering several fields at once.
    const body =
      typeof params.fieldname === 'string' ? { [params.fieldname]: params.value } : params.fieldname
    if (params.doctype === 'FCRM Settings') {
      return httpJson('PATCH', '/api/crm/settings/update/', { body })
    }
    if (params.doctype === 'System Settings') {
      return httpJson('PATCH', '/api/crm/system-settings/update/', { body })
    }
    const endpoint = endpointFor(params.doctype)
    return httpJson('PATCH', `${endpoint}${params.name}/`, { body })
  }

  if (url === 'frappe.client.delete') {
    const endpoint = endpointFor(params.doctype)
    await httpJson('DELETE', `${endpoint}${params.name}/`)
    return { name: params.name }
  }

  if (url === 'run_doc_method') {
    const endpoint = endpointFor(params.dt)
    const actionPath = params.method.replace(/_/g, '-')
    return httpJson('POST', `${endpoint}${params.dn}/${actionPath}/`, { body: params.args })
  }

  // Literal path (e.g. a specific detail-fetch or a custom crm.api.* call
  // that's been given a real REST equivalent below).
  const path = url.startsWith('/') || url.startsWith('http') ? url : `/api/crm/${url}`
  return httpJson(options.method || 'GET', path, { params })
}

// frappe-ui's `call()` helper (imported directly as `import { call } from
// 'frappe-ui'`, used throughout ported components for one-off RPCs -- e.g.
// Modals/ViewModal.vue's create/update) does NOT go through the configured
// resourceFetcher: it always does a raw `fetch('/api/method/' + method, ...)`
// with no auth header, expecting Frappe's own backend at that path. Since we
// can't edit frappe-ui's source (and the mandate is to keep ported Vue files
// unmodified), this patches the global fetch once at load time to intercept
// exactly that path, decode the method name + JSON body `call()` sent, run it
// through the same djangoResourceFetcher translation every other resource
// call uses (so it picks up JWT auth and METHOD_ENDPOINTS/frappe.client.*
// handling), and hand back a Response shaped the way call() expects
// (`{message: <result>}` on success; call() unwraps `.message` unless the
// payload has `.docs`).
let fetchPatched = false
export function installFetchInterceptor() {
  if (fetchPatched || typeof window === 'undefined') return
  fetchPatched = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = async function patchedFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input?.url || ''
    if (!url.startsWith('/api/method/')) {
      return originalFetch(input, init)
    }

    const method = decodeURIComponent(url.slice('/api/method/'.length))
    let params = {}
    const body = init?.body ?? (typeof input === 'object' ? input?.body : undefined)
    if (body) {
      try {
        params = JSON.parse(body)
      } catch {
        params = {}
      }
    }

    try {
      const result = await djangoResourceFetcher({ url: method, params, method: 'POST' })
      return new Response(JSON.stringify({ message: result }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      const payload = {
        exc_type: error.exc_type || 'Exception',
        _error_message: error.message,
        message: error.messages,
      }
      return new Response(JSON.stringify(payload), {
        status: error.status || 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
}

installFetchInterceptor()

// frappe-ui's FileUploadHandler (used by FilesUploader / AttachControl / the
// rich-text editor's image upload) posts via raw XMLHttpRequest straight to
// '/api/method/upload_file', bypassing fetch() entirely -- so the fetch
// patch above can't attach the JWT header to it. This patches XHR the same
// way: inject the bearer token right before send() for any request to that
// endpoint. The endpoint path itself needs no rewriting (apps/core/upload_
// views.py is served at that exact literal path -- see config/urls.py).
let xhrPatched = false
export function installXhrInterceptor() {
  if (xhrPatched || typeof XMLHttpRequest === 'undefined') return
  xhrPatched = true

  const originalOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__isUploadRequest = typeof url === 'string' && url.startsWith('/api/method/upload_file')
    return originalOpen.call(this, method, url, ...rest)
  }

  const originalSend = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.send = function (...args) {
    if (this.__isUploadRequest) {
      const auth = authStore()
      if (auth.accessToken) {
        this.setRequestHeader('Authorization', `Bearer ${auth.accessToken}`)
      }
    }
    return originalSend.apply(this, args)
  }
}

installXhrInterceptor()

// Set as an import-time side effect (not from main.js's own top-level code)
// so it's guaranteed to run before ANY resource's first auto-fetch. ES
// modules resolve the whole static import graph before a module's own
// procedural code runs; main.js's `import App from './App.vue'` (and
// `import router from './router'`) pull in stores like stores/settings.js
// -- which create an `auto: true` createDocumentResource() at module scope,
// firing its fetch() synchronously during that graph resolution -- well
// before main.js reaches a `setConfig(...)` call placed in its own body.
// Without this, that first fetch silently falls back to frappe-ui's default
// fetcher (a raw `fetch('/api/method/...')`, meant for a real Frappe
// backend we don't have), 404s against Django, and is swallowed by
// createResource's error handling with no visible error -- the resource's
// data just silently stays empty forever, since nothing ever calls
// .reload() again afterward.
setConfig('resourceFetcher', djangoResourceFetcher)

export { httpJson }
