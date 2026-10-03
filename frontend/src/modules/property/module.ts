import type { ModuleDefinition } from '@/core/modules/types'
import { propertyEndpoints } from './api/endpoints'

export const propertyModule: ModuleDefinition = {
  id: 'property',
  label: 'Property',
  icon: 'lucide-building-2',
  endpoints: propertyEndpoints,
}
