import type { ModuleRoute } from '@/core/modules/types'

function listRoute(name: string, slug: string, viewDoctype: string, component: ModuleRoute['component']): ModuleRoute {
  return { name, path: `/${slug}/view/:viewType?`, aliases: [`/${slug}`], meta: { viewDoctype }, component }
}

export const crmRoutes: ModuleRoute[] = [
  { name: 'Home', path: '/' },
  { name: 'Notifications', path: '/notifications', component: () => import('./pages/MobileNotification') },
  { name: 'Dashboard', path: '/dashboard', component: () => import('./pages/Dashboard') },
  listRoute('Leads', 'leads', 'CRM Lead', () => import('./pages/Leads')),
  { name: 'Lead', path: '/leads/:leadId', component: () => import('./pages/Lead') },
  listRoute('Deals', 'deals', 'CRM Deal', () => import('./pages/Deals')),
  { name: 'Deal', path: '/deals/:dealId', component: () => import('./pages/Deal') },
  listRoute('Notes', 'notes', 'FCRM Note', () => import('./pages/Notes')),
  listRoute('Tasks', 'tasks', 'CRM Task', () => import('./pages/Tasks')),
  listRoute('Contacts', 'contacts', 'Contact', () => import('./pages/Contacts')),
  { name: 'Contact', path: '/contacts/:contactId', component: () => import('./pages/Contact') },
  listRoute('Organizations', 'organizations', 'CRM Organization', () => import('./pages/Organizations')),
  {
    name: 'Organization',
    path: '/organizations/:organizationId',
    component: () => import('./pages/Organization'),
  },
  listRoute('Call Logs', 'call-logs', 'CRM Call Log', () => import('./pages/CallLogs')),
  { name: 'DataImportList', path: '/data-import', component: () => import('./pages/DataImport') },
  { name: 'NewDataImport', path: '/data-import/doctype/:doctype', component: () => import('./pages/DataImport') },
  { name: 'DataImport', path: '/data-import/:importName', component: () => import('./pages/DataImport') },
  { name: 'Invalid Page', path: '/:invalidpath', component: () => import('./pages/InvalidPage') },
  { name: 'Not Permitted', path: '/not-permitted', component: () => import('./pages/NotPermitted') },
]
