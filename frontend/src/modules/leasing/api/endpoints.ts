import type { ModuleEndpoints } from '@/core/api/endpointRegistry'

export const leasingEndpoints: ModuleEndpoints = {
  doctypes: {
    Tenant: 'leasing/tenants',
    Lease: 'leasing/leases',
    'Lease Document': 'leasing/lease-documents',
  },
}
