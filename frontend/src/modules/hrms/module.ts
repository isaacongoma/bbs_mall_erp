import type { ModuleDefinition } from '@/core/modules/types'
import { hrmsEndpoints } from './api/endpoints'
import { hrmsRouteGuard } from './guards'
import { hrmsNavigation } from './navigation'
import { hrmsRoutes } from './routes'
import { HrmsHeaderActions, HrmsMobileTabs } from './shell'

export const hrmsModule: ModuleDefinition = {
  id: 'hrms',
  label: 'HR Self Service',
  icon: 'lucide-briefcase-business',
  railOrder: 50,
  endpoints: hrmsEndpoints,
  routes: hrmsRoutes,
  guards: [hrmsRouteGuard],
  navigation: hrmsNavigation,
  shell: { headerActions: HrmsHeaderActions, overlays: HrmsMobileTabs },
}
