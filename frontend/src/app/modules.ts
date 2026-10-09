import { registerModule } from '@/core/modules/registry'
import { crmModule } from '@/modules/crm/module'
import { iotModule } from '@/modules/iot/module'
import { leasingModule } from '@/modules/leasing/module'
import { propertyModule } from '@/modules/property/module'
import { hrmsModule } from '@/modules/hrms/module'
import { deskModule } from '@/modules/desk/module'

let registered = false

export function registerAllModules(): void {
  if (registered) return
  registered = true
  for (const module of [deskModule, crmModule, propertyModule, leasingModule, iotModule, hrmsModule]) {
    registerModule(module)
  }
}
