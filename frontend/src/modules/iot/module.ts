import type { ModuleDefinition } from '@/core/modules/types'
import { iotEndpoints } from './api/endpoints'

export const iotModule: ModuleDefinition = {
  id: 'iot',
  label: 'IoT & Security',
  icon: 'lucide-cpu',
  endpoints: iotEndpoints,
}
