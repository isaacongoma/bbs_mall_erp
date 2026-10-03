import type { ModuleEndpoints } from '@/core/api/endpointRegistry'

export const iotEndpoints: ModuleEndpoints = {
  doctypes: {
    'IoT Gateway': 'iot/gateways',
    'IoT Device': 'iot/devices',
    'Registered Vehicle': 'iot/vehicles',
    'Parking Session': 'iot/parking-sessions',
    'Security Event': 'iot/security-events',
  },
}
