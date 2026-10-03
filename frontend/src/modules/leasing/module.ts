import type { ModuleDefinition } from '@/core/modules/types'
import { leasingEndpoints } from './api/endpoints'

export const leasingModule: ModuleDefinition = {
  id: 'leasing',
  label: 'Leasing',
  icon: 'lucide-key-round',
  endpoints: leasingEndpoints,
}
