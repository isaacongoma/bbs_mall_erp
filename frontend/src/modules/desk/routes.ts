import type { ModuleRoute } from '@/core/modules/types'

export const deskRoutes: ModuleRoute[] = [
  {
    name: 'Desk Apps',
    path: '/apps',
    component: () => import('../../shared/pages/DeskAppsPage'),
  },
  {
    name: 'Desk Workspace',
    path: '/app',
    component: () => import('../../shared/pages/DeskWorkspacePage'),
  },
  {
    name: 'Desk Report',
    path: '/app/query-report/:report',
    component: () => import('../../shared/pages/DeskReportPage'),
  },
  {
    name: 'Desk Dashboard View',
    path: '/app/dashboard-view/:name',
    component: () => import('../../shared/pages/DeskDashboardPage'),
  },
  {
    name: 'Desk Notifications',
    path: '/app/notifications',
    component: () => import('../../shared/pages/DeskNotificationsPage'),
  },
  {
    name: 'Desk Data Import List',
    path: '/app/data-import',
    component: () => import('../../shared/pages/DeskDataImportPage'),
  },
  {
    name: 'Desk New Data Import',
    path: '/app/data-import/doctype/:doctype',
    component: () => import('../../shared/pages/DeskDataImportPage'),
  },
  {
    name: 'Desk Data Import',
    path: '/app/data-import/:importName',
    component: () => import('../../shared/pages/DeskDataImportPage'),
  },
  {
    name: 'Desk List',
    path: '/app/:doctype/view/:viewType?',
    aliases: ['/app/:doctype'],
    component: () => import('../../shared/pages/DeskEntryPage'),
  },
  {
    name: 'Desk New Document',
    path: '/app/:doctype/new',
    component: () => import('../../shared/pages/DeskFormPage'),
  },
  {
    name: 'Desk Document',
    path: '/app/:doctype/:name',
    component: () => import('../../shared/pages/DeskFormPage'),
  },
]
