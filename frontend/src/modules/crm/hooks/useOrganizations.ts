import { useObservable } from '@/core/resources'
import { ensureOrganizationsLoaded, getOrganization, useOrganizationsStore } from '../stores/organizationsStore'

export function useOrganizations() {
  const resource = ensureOrganizationsLoaded()
  useObservable(resource)
  useOrganizationsStore((state) => state.organizationsByName)
  return { organizations: resource, getOrganization }
}
