import type { ModuleRoute } from '@/core/modules/types'

const bare = { bare: true }

export const tenantRoutes: ModuleRoute[] = [
  { name: 'Tenant Home', path: '/tenant', meta: bare, component: () => import('./pages/Dashboard') },
  { name: 'Tenant Invoices', path: '/tenant/invoices', meta: bare, component: () => import('./pages/Invoices') },
  {
    name: 'Tenant Invoice',
    path: '/tenant/invoices/:name',
    meta: bare,
    component: () => import('./pages/InvoiceDetail'),
  },
  { name: 'Tenant Payments', path: '/tenant/payments', meta: bare, component: () => import('./pages/Payments') },
  { name: 'Tenant Statement', path: '/tenant/statement', meta: bare, component: () => import('./pages/Statement') },
  { name: 'Tenant Lease', path: '/tenant/lease', meta: bare, component: () => import('./pages/Lease') },
  {
    name: 'Tenant Maintenance',
    path: '/tenant/maintenance',
    meta: bare,
    component: () => import('./pages/Maintenance'),
  },
  {
    name: 'Tenant New Maintenance',
    path: '/tenant/maintenance/new',
    meta: bare,
    component: () => import('./pages/MaintenanceNew'),
  },
  {
    name: 'Tenant Maintenance Request',
    path: '/tenant/maintenance/:name',
    meta: bare,
    component: () => import('./pages/MaintenanceDetail'),
  },
  { name: 'Tenant Utilities', path: '/tenant/meters', meta: bare, component: () => import('./pages/Meters') },
  { name: 'Tenant Sales', path: '/tenant/sales', meta: bare, component: () => import('./pages/Sales') },
  { name: 'Tenant Notices', path: '/tenant/notices', meta: bare, component: () => import('./pages/Notices') },
  { name: 'Tenant Team', path: '/tenant/team', meta: bare, component: () => import('./pages/Team') },
  { name: 'Tenant Profile', path: '/tenant/profile', meta: bare, component: () => import('./pages/Profile') },
]
