import { registerModule } from '@/core/modules/registry'
import { crmModule } from '@/modules/crm/module'
import { iotModule } from '@/modules/iot/module'
import { tenantModule } from '@/modules/tenant/module'
import { hrmsModule } from '@/modules/hrms/module'
import { deskModule } from '@/modules/desk/module'

let registered = false

export function registerAllModules(): void {
  if (registered) return
  registered = true
  for (const module of [deskModule, tenantModule, crmModule, iotModule, hrmsModule]) {
    registerModule(module)
  }
}
