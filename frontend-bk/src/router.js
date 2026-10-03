import { createRouter, createWebHistory } from 'vue-router'
import { call } from 'frappe-ui'
import { usersStore } from '@/stores/users'
import { sessionStore } from '@/stores/session'
import { viewsStore } from '@/stores/views'

let personaChecked = false
export const PERSONA_DONE_KEY = 'crm_persona_captured'

async function shouldCapturePersona() {
  // Client-side flag guards against re-prompting if the server persist failed.
  if (localStorage.getItem(PERSONA_DONE_KEY)) return false
  const captured = await call('frappe.client.get_single_value', {
    doctype: 'FCRM Settings',
    field: 'persona_captured',
  })
  if (captured) return false
  // The wizard only feeds telemetry; skip it entirely if the user opted out.
  const { enabled } =
    (await call('frappe.utils.telemetry.pulse.client.boot_config')) || {}
  return !!enabled
}

const routes = [
  {
    path: '/',
    name: 'Home',
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/pages/MobileNotification.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/pages/Dashboard.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/pages/Dashboard.vue'),
  },
  // Property Doctypes
  {
    alias: '/malls',
    path: '/malls/view/:viewType?',
    name: 'Malls',
    component: () => import('@/pages/GenericList.vue'),
    meta: { doctype: 'Mall' },
  },
  {
    path: '/malls/:id',
    name: 'Mall',
    component: () => import('@/pages/GenericDetail.vue'),
    meta: { doctype: 'Mall' },
    props: true,
  },
  {
    alias: '/buildings',
    path: '/buildings/view/:viewType?',
    name: 'Buildings',
    component: () => import('@/pages/GenericList.vue'),
    meta: { doctype: 'Building' },
  },
  {
    path: '/buildings/:id',
    name: 'Building',
    component: () => import('@/pages/GenericDetail.vue'),
    meta: { doctype: 'Building' },
    props: true,
  },
  {
    alias: '/units',
    path: '/units/view/:viewType?',
    name: 'Units',
    component: () => import('@/pages/GenericList.vue'),
    meta: { doctype: 'Unit' },
  },
  {
    path: '/units/:id',
    name: 'Unit',
    component: () => import('@/pages/GenericDetail.vue'),
    meta: { doctype: 'Unit' },
    props: true,
  },
  // Leasing Doctypes
  {
    alias: '/tenants',
    path: '/tenants/view/:viewType?',
    name: 'Tenants',
    component: () => import('@/pages/GenericList.vue'),
    meta: { doctype: 'Tenant' },
  },
  {
    path: '/tenants/:id',
    name: 'Tenant',
    component: () => import('@/pages/GenericDetail.vue'),
    meta: { doctype: 'Tenant' },
    props: true,
  },
  {
    alias: '/leases',
    path: '/leases/view/:viewType?',
    name: 'Leases',
    component: () => import('@/pages/GenericList.vue'),
    meta: { doctype: 'Lease' },
  },
  {
    path: '/leases/:id',
    name: 'Lease',
    component: () => import('@/pages/GenericDetail.vue'),
    meta: { doctype: 'Lease' },
    props: true,
  },
  // Accounting Doctypes
  {
    alias: '/sales-invoices',
    path: '/sales-invoices/view/:viewType?',
    name: 'Sales Invoices',
    component: () => import('@/pages/GenericList.vue'),
    meta: { doctype: 'Sales Invoice' },
  },
  {
    path: '/sales-invoices/:id',
    name: 'Sales Invoice',
    component: () => import('@/pages/GenericDetail.vue'),
    meta: { doctype: 'Sales Invoice' },
    props: true,
  },
  {
    alias: '/payment-entries',
    path: '/payment-entries/view/:viewType?',
    name: 'Payment Entries',
    component: () => import('@/pages/GenericList.vue'),
    meta: { doctype: 'Payment Entry' },
  },
  {
    path: '/payment-entries/:id',
    name: 'Payment Entry',
    component: () => import('@/pages/GenericDetail.vue'),
    meta: { doctype: 'Payment Entry' },
    props: true,
  },
  // IoT Doctypes
  {
    alias: '/iot-gateways',
    path: '/iot-gateways/view/:viewType?',
    name: 'IoT Gateways',
    component: () => import('@/pages/GenericList.vue'),
    meta: { doctype: 'IoT Gateway' },
  },
  {
    path: '/iot-gateways/:id',
    name: 'IoT Gateway',
    component: () => import('@/pages/GenericDetail.vue'),
    meta: { doctype: 'IoT Gateway' },
    props: true,
  },
  {
    alias: '/parking-sessions',
    path: '/parking-sessions/view/:viewType?',
    name: 'Parking Sessions',
    component: () => import('@/pages/GenericList.vue'),
    meta: { doctype: 'Parking Session' },
  },
  {
    path: '/parking-sessions/:id',
    name: 'Parking Session',
    component: () => import('@/pages/GenericDetail.vue'),
    meta: { doctype: 'Parking Session' },
    props: true,
  },
  {
    alias: '/security-events',
    path: '/security-events/view/:viewType?',
    name: 'Security Events',
    component: () => import('@/pages/GenericList.vue'),
    meta: { doctype: 'Security Event' },
  },
  {
    path: '/security-events/:id',
    name: 'Security Event',
    component: () => import('@/pages/GenericDetail.vue'),
    meta: { doctype: 'Security Event' },
    props: true,
  },

  // Helpdesk Doctypes
  {
    alias: '/tickets',
    path: '/tickets/view/:viewType?',
    name: 'Tickets',
    component: () => import('@/helpdesk/pages/ticket/Tickets.vue'),
    meta: { doctype: 'HD Ticket' },
  },
  {
    path: '/tickets/:id',
    name: 'Ticket',
    component: () => import('@/helpdesk/pages/ticket/TicketAgent.vue'),
    meta: { doctype: 'HD Ticket' },
    props: true,
  },

  {
    alias: '/leads',
    path: '/leads/view/:viewType?',
    name: 'Leads',
    component: () => import('@/pages/Leads.vue'),
  },
  {
    path: '/leads/:leadId',
    name: 'Lead',
    component: () => import(`@/pages/${handleMobileView('Lead')}.vue`),
    props: true,
  },
  {
    alias: '/deals',
    path: '/deals/view/:viewType?',
    name: 'Deals',
    component: () => import('@/pages/Deals.vue'),
  },
  {
    path: '/deals/:dealId',
    name: 'Deal',
    component: () => import(`@/pages/${handleMobileView('Deal')}.vue`),
    props: true,
  },
  {
    alias: '/notes',
    path: '/notes/view/:viewType?',
    name: 'Notes',
    component: () => import('@/pages/Notes.vue'),
  },
  {
    alias: '/tasks',
    path: '/tasks/view/:viewType?',
    name: 'Tasks',
    component: () => import('@/pages/Tasks.vue'),
  },
  {
    alias: '/contacts',
    path: '/contacts/view/:viewType?',
    name: 'Contacts',
    component: () => import('@/pages/Contacts.vue'),
  },
  {
    path: '/contacts/:contactId',
    name: 'Contact',
    component: () => import(`@/pages/${handleMobileView('Contact')}.vue`),
    props: true,
  },
  {
    alias: '/organizations',
    path: '/organizations/view/:viewType?',
    name: 'Organizations',
    component: () => import('@/pages/Organizations.vue'),
  },
  {
    path: '/organizations/:organizationId',
    name: 'Organization',
    component: () => import(`@/pages/${handleMobileView('Organization')}.vue`),
    props: true,
  },
  {
    alias: '/call-logs',
    path: '/call-logs/view/:viewType?',
    name: 'Call Logs',
    component: () => import('@/pages/CallLogs.vue'),
  },
  {
    path: '/data-import',
    name: 'DataImportList',
    component: () => import('@/pages/DataImport.vue'),
  },
  {
    path: '/data-import/doctype/:doctype',
    name: 'NewDataImport',
    component: () => import('@/pages/DataImport.vue'),
    props: true,
  },
  {
    path: '/data-import/:importName',
    name: 'DataImport',
    component: () => import('@/pages/DataImport.vue'),
    props: true,
  },
  {
    path: '/welcome',
    name: 'Welcome',
    component: () => import('@/pages/Welcome.vue'),
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/pages/PersonaForm.vue'),
  },
  {
    path: '/:invalidpath',
    name: 'Invalid Page',
    component: () => import('@/pages/InvalidPage.vue'),
  },
  {
    path: '/not-permitted',
    name: 'Not Permitted',
    component: () => import('@/pages/NotPermitted.vue'),
  },
]

const handleMobileView = (componentName) => {
  return window.innerWidth < 768 ? `Mobile${componentName}` : componentName
}

let router = createRouter({
  history: createWebHistory('/crm'),
  routes,
})

router.beforeEach(async (to, from, next) => {
  router.previousRoute = from

  const { isLoggedIn, user } = sessionStore()
  const { users, isCrmUser, isAdmin } = usersStore()

  if (isLoggedIn && !users.fetched) {
    try {
      await users.promise
    } catch (error) {
      console.error('Error loading users', error)
      if (error?.exc_type !== 'PermissionError') {
        return next(false)
      }
    }
  }

  const isAdminUser = isLoggedIn && (isAdmin() || user === 'Administrator')

  // Only admins who haven't finished may reach the wizard, even via direct URL.
  if (isLoggedIn && to.name === 'Onboarding') {
    try {
      if (!isAdminUser || !(await shouldCapturePersona())) {
        return next({ name: 'Home' })
      }
    } catch {
      return next({ name: 'Home' })
    }
  }

  if (
    isLoggedIn &&
    isCrmUser() &&
    !personaChecked &&
    to.name !== 'Onboarding' &&
    isAdminUser
  ) {
    personaChecked = true
    try {
      if (await shouldCapturePersona()) {
        return next({ name: 'Onboarding' })
      }
    } catch (error) {
      // fail open
    }
  }

  if (isLoggedIn && to.name !== 'Not Permitted' && !isCrmUser()) {
    next({ name: 'Not Permitted' })
  } else if (to.name === 'Not Permitted' && isLoggedIn && isCrmUser()) {
    next({ name: 'Home' })
  } else if (to.name === 'Home' && isLoggedIn) {
    const { views, getDefaultView } = viewsStore()
    await views.promise

    let defaultView = getDefaultView()
    if (!defaultView) {
      next({ name: 'Leads' })
      return
    }

    let { route_name, type, name, is_standard } = defaultView
    route_name = route_name || 'Leads'

    if (name && !is_standard) {
      next({
        name: route_name,
        params: { viewType: type },
        query: { view: name },
      })
    } else {
      next({ name: route_name, params: { viewType: type } })
    }
  } else if (!isLoggedIn) {
    // The original redirects to Frappe desk's separate cookie-session login
    // page here. We have no such page -- App.vue renders Login.vue inline
    // (v-if="!auth.isLoggedIn") instead of ever mounting <router-view>, so
    // there is nothing for this guard to do while logged out; a hard
    // redirect to a nonexistent /login would just reload this same SPA and
    // loop. next() lets the (unmounted) navigation resolve harmlessly.
    next()
  } else if (to.matched.length === 0) {
    next({ name: 'Invalid Page' })
  } else if (['Deal', 'Lead'].includes(to.name) && !to.hash) {
    let storageKey = to.name === 'Deal' ? 'lastDealTab' : 'lastLeadTab'
    const activeTab = localStorage.getItem(storageKey) || 'activity'
    const hash = '#' + activeTab
    next({ ...to, hash })
  } else if (
    [
      'Leads',
      'Deals',
      'Contacts',
      'Organizations',
      'Notes',
      'Tasks',
      'Call Logs',
      'Malls',
      'Buildings',
      'Units',
      'Tenants',
      'Leases',
      'Sales Invoices',
      'Payment Entries',
      'IoT Gateways',
      'Parking Sessions',
      'Security Events',
      'Tickets',
    ].includes(to.name) &&
    !to.query?.view
  ) {
    const { views, standardViews, getDefaultView } = viewsStore()
    await views.promise

    const viewType = to.params?.viewType ?? ''
    const standardViewTypes = ['list', 'kanban', 'group_by']

    if (!viewType) {
      const doctypeMap = {
        Leads: 'CRM Lead',
        Deals: 'CRM Deal',
        Contacts: 'Contact',
        Organizations: 'CRM Organization',
        Notes: 'FCRM Note',
        Tasks: 'CRM Task',
        'Call Logs': 'CRM Call Log',
        Malls: 'Mall',
        Buildings: 'Building',
        Units: 'Unit',
        Tenants: 'Tenant',
        Leases: 'Lease',
        'Sales Invoices': 'Sales Invoice',
        'Payment Entries': 'Payment Entry',
        'IoT Gateways': 'IoT Gateway',
        'Parking Sessions': 'Parking Session',
        'Security Events': 'Security Event',
        Tickets: 'HD Ticket',
      }

      const doctype = doctypeMap[to.name]
      let defaultViewType = 'list'

      let globalDefault = getDefaultView(to.name)
      if (globalDefault) {
        defaultViewType = globalDefault.type || 'list'
        if (globalDefault.name && !globalDefault.is_standard) {
          next({
            name: to.name,
            params: { viewType: defaultViewType },
            query: { ...to.query, view: globalDefault.name },
          })
          return
        }
      }

      for (const viewType of standardViewTypes) {
        const standardView = standardViews.value?.[doctype + ' ' + viewType]
        if (standardView?.is_default) {
          defaultViewType = viewType
          break
        }
      }

      next({
        name: to.name,
        params: { viewType: defaultViewType },
        query: to.query,
      })
    } else if (!standardViewTypes.includes(viewType)) {
      const viewNameOrLabel = viewType

      let view = views.data?.find(
        (v) => v.name == viewNameOrLabel || v.label === viewNameOrLabel,
      )

      if (view) {
        next({
          name: to.name,
          params: { viewType: view.type || 'list' },
          query: { ...to.query, view: view.name },
        })
      } else {
        next({
          name: to.name,
          params: { viewType: 'list' },
          query: to.query,
        })
      }
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
