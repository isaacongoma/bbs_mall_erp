import { create } from 'zustand'
import { createResource, type Resource } from '@/core/resources'

export interface CrmOrganization {
  name: string
  [key: string]: any
}

interface OrganizationsState {
  organizationsByName: Record<string, CrmOrganization>
}

export const useOrganizationsStore = create<OrganizationsState>(() => ({ organizationsByName: {} }))

let organizationsResource: Resource<CrmOrganization[]> | null = null

export function ensureOrganizationsLoaded(): Resource<CrmOrganization[]> {
  if (organizationsResource) return organizationsResource

  organizationsResource = createResource<CrmOrganization[]>({
    url: 'crm.api.session.get_organizations',
    cache: 'organizations',
    initialData: [],
    auto: true,
    transform(organizations) {
      const organizationsByName: Record<string, CrmOrganization> = {}
      for (const organization of organizations) organizationsByName[organization.name] = organization
      useOrganizationsStore.setState({ organizationsByName })
      return organizations
    },
    onError(error: any) {
      if (['AuthenticationError', 'PermissionError'].includes(error?.exc_type)) {
        window.location.href = '/login?redirect-to=/crm'
      }
    },
  })
  return organizationsResource
}

export function getOrganization(name: string): CrmOrganization | undefined {
  return useOrganizationsStore.getState().organizationsByName[name]
}
