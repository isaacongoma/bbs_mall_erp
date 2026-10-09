import type { ModuleDefinition } from '@/core/modules/types'
import { registerDoctypeScripts } from '@/shared/data/script'
import { crmEndpoints } from './api/endpoints'
import { crmRouteGuard } from './guards'
import { crmRoutes } from './routes'
import { crmNavigation } from './navigation'
import { crmSettings } from './settings'
import { CrmSidebarSections } from './components/CrmSidebarSections'
import { CallUI } from './components/Telephony/CallUI'
import { Notifications } from './components/Notifications'
import { NotificationsSidebarItem } from './components/NotificationsSidebarItem'

registerDoctypeScripts(import.meta.glob<Record<string, unknown>>('./doctypes/*/*.ts'))

export const crmModule: ModuleDefinition = {
  id: 'crm',
  label: 'CRM',
  icon: 'lucide-handshake',
  endpoints: crmEndpoints,
  routes: crmRoutes,
  guards: [crmRouteGuard],
  navigation: crmNavigation,
  settings: crmSettings,
  shell: {
    sidebarTop: NotificationsSidebarItem,
    sidebarSections: CrmSidebarSections,
    sidebarPanels: Notifications,
    headerActions: CallUI,
  },
}
