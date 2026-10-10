import type { ModuleDefinition } from '@/core/modules/types'
import { DeskHeaderActions } from '@/shared/components/DeskHeaderActions'
import { deskRoutes } from './routes'
import { registerClientScripts, registerDoctypeExtensions, registerSharedScripts } from '@/shared/frappe/scriptLoader'

registerClientScripts(
  import.meta.glob<Record<string, unknown>>('../{erpnext,frappe,hrms,bbs_property}/**/{doctype,report,page}/*/*.ts'),
)
registerSharedScripts('erpnext', () => import('../erpnext/erpnext.bundle'))
registerSharedScripts('hrms', () => import('../hrms/hrms.bundle'))
registerDoctypeExtensions('Bank Transaction', () => import('../hrms/public/js/erpnext/bank_transaction'))
registerDoctypeExtensions('Company', () => import('../hrms/public/js/erpnext/company'))
registerDoctypeExtensions('Delivery Trip', () => import('../hrms/public/js/erpnext/delivery_trip'))
registerDoctypeExtensions('Department', () => import('../hrms/public/js/erpnext/department'))
registerDoctypeExtensions('Employee', () => import('../hrms/public/js/erpnext/employee'))
registerDoctypeExtensions('Journal Entry', () => import('../hrms/public/js/erpnext/journal_entry'))
registerDoctypeExtensions('Payment Entry', () => import('../hrms/public/js/erpnext/payment_entry'))
registerDoctypeExtensions('Customer', () => import('../bbs_property/property_management/extensions/customer'))
registerDoctypeExtensions('Sales Invoice', () => import('../bbs_property/property_management/extensions/sales_invoice'))
registerDoctypeExtensions('Timesheet', () => import('../hrms/public/js/erpnext/timesheet'))

export const deskModule: ModuleDefinition = {
  id: 'desk',
  label: 'Desk',
  icon: 'lucide-layout-dashboard',
  routes: deskRoutes,
  shell: { headerActions: DeskHeaderActions },
}
