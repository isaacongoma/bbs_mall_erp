import type { NavigationItem } from '@/core/modules/types'
import { ContactsIcon, PhoneIcon } from '@/shared/components/Icons'
import { DealsIcon, LeadsIcon, NoteIcon, OrganizationsIcon, TaskIcon } from './components/Icons'

function item(id: string, icon: NavigationItem['icon'], order: number): NavigationItem {
  return { id, label: id, to: { name: id }, icon, order }
}

export const crmNavigation: NavigationItem[] = [
  { ...item('Dashboard', 'lucide-layout-dashboard', 5), desktopOnly: true },
  item('Leads', LeadsIcon, 10),
  item('Deals', DealsIcon, 20),
  item('Contacts', ContactsIcon, 30),
  item('Organizations', OrganizationsIcon, 40),
  item('Notes', NoteIcon, 50),
  item('Tasks', TaskIcon, 60),
  item('Call Logs', PhoneIcon, 70),
]
