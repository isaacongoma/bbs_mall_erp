import type { ModuleDefinition } from '@/core/modules/types'
import { tenantRouteGuard } from './guards'
import { tenantRoutes } from './routes'

export const tenantModule: ModuleDefinition = {
  id: 'tenant',
  label: 'Tenant Portal',
  icon: 'lucide-store',
  rail: false,
  routes: tenantRoutes,
  guards: [tenantRouteGuard],
}
