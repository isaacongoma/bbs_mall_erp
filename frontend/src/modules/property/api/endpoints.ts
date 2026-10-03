import type { ModuleEndpoints } from '@/core/api/endpointRegistry'

export const propertyEndpoints: ModuleEndpoints = {
  doctypes: {
    Mall: 'property/malls',
    Building: 'property/buildings',
    Floor: 'property/floors',
    Unit: 'property/units',
  },
}
