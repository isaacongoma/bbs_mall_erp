import { registerModule } from '@/core/modules/registry'
import { crmModule } from '@/modules/crm/module'
import { iotModule } from '@/modules/iot/module'
import { leasingModule } from '@/modules/leasing/module'
import { propertyModule } from '@/modules/property/module'

let registered = false

export function registerAllModules(): void {
  if (registered) return
  registered = true
  for (const module of [crmModule, propertyModule, leasingModule, iotModule]) {
    registerModule(module)
  }
}
