import type { SettingsGroup } from '@/core/modules/types'
import { Email2Icon, PhoneIcon } from '@/shared/components/Icons'
import { isManager } from '@/shared/stores/usersStore'
import { EmailTemplateIcon } from './components/Icons/EmailTemplateIcon'
import { BrandSettings } from './components/Settings/BrandSettings'
import { AssignmentRulePage } from './components/Settings/AssignmentRulePage'
import { EmailConfig } from './components/Settings/EmailConfig'
import { EmailTemplatePage } from './components/Settings/EmailTemplatePage'
import { DashboardSettings } from './components/Settings/DashboardSettings'
import { DefaultsSettings } from './components/Settings/DefaultsSettings'
import { EnrichmentSettings } from './components/Settings/EnrichmentSettings'
import { GeneralSettings } from './components/Settings/GeneralSettings'
import { HomeActions } from './components/Settings/HomeActions'
import { InviteUserPage } from './components/Settings/InviteUserPage'
import { PreferencesSettings } from './components/Settings/PreferencesSettings'
import { ProfilePage } from './components/Settings/ProfilePage'
import { TelephonyPage } from './components/Settings/TelephonyPage'
import { SlaConfig } from './components/Settings/SlaConfig'
import { FormsSettings } from './components/Settings/FormsSettings'
import { WorkflowAutomationPage } from './components/Settings/WorkflowAutomationPage'
import { LeadSyncSourcePage } from './components/Settings/LeadSyncSourcePage'
import { Hierarchy } from './components/Settings/Hierarchy'
import { Users } from './components/Settings/Users'

export const crmSettings: SettingsGroup[] = [
  {
    label: 'User Configuration',
    items: [
      { id: 'Profile', label: 'Profile', icon: 'lucide-circle-user-round', component: ProfilePage },
      { id: 'Preferences', label: 'Preferences', icon: 'lucide-sliders-horizontal', component: PreferencesSettings },
    ],
  },
  {
    label: 'User Management',
    condition: () => isManager(),
    items: [
      { id: 'Users', label: 'Users', icon: 'lucide-users', component: Users },
      { id: 'Invite User', label: 'Invite User', icon: 'lucide-user-plus', component: InviteUserPage },
      { id: 'Sales Hierarchy', label: 'Sales Hierarchy', icon: 'lucide-network', component: Hierarchy },
    ],
  },
  {
    label: 'System Configuration',
    condition: () => isManager(),
    items: [
      { id: 'General', label: 'General', icon: 'lucide-settings', component: GeneralSettings },
      { id: 'Dashboard', label: 'Dashboard', icon: 'lucide-layout-dashboard', component: DashboardSettings },
      { id: 'Defaults', label: 'Defaults', icon: 'lucide-monitor-cog', component: DefaultsSettings },
      { id: 'Brand', label: 'Brand', icon: 'lucide-sparkles', component: BrandSettings },
    ],
  },
  {
    label: 'Email',
    items: [
      { id: 'Accounts', label: 'Accounts', icon: Email2Icon, component: EmailConfig, condition: () => isManager() },
      { id: 'Templates', label: 'Templates', icon: EmailTemplateIcon, component: EmailTemplatePage },
    ],
  },
  {
    label: 'Automation & Rules',
    condition: () => isManager(),
    items: [
      {
        id: 'Workflow Automations',
        label: 'Workflow Automations',
        icon: 'lucide-workflow',
        component: WorkflowAutomationPage,
      },
      {
        id: 'Assignment Rules',
        label: 'Assignment Rules',
        icon: 'lucide-settings-2',
        component: AssignmentRulePage,
      },
      { id: 'SLA Policies', label: 'SLA Policies', icon: 'lucide-shield-check', component: SlaConfig },
      { id: 'Forms', label: 'Forms', icon: 'lucide-text-cursor-input', component: FormsSettings },
      { id: 'Enrichment', label: 'Enrichment', icon: 'lucide-zap', component: EnrichmentSettings },
    ],
  },
  {
    label: 'Customization',
    condition: () => isManager(),
    items: [{ id: 'Home Actions', label: 'Home Actions', icon: 'lucide-house', component: HomeActions }],
  },
  {
    label: 'Integrations',
    items: [
      { id: 'Telephony', label: 'Telephony', icon: PhoneIcon, component: TelephonyPage },
      {
        id: 'Lead Syncing',
        label: 'Lead Syncing',
        icon: 'lucide-refresh-cw',
        component: LeadSyncSourcePage,
        condition: () => isManager(),
      },
    ],
  },
]
