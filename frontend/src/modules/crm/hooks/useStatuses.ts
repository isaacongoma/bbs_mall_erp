import { useObservable } from '@/core/resources'
import {
  ensureStatusesLoaded,
  getCommunicationStatus,
  getDealStatus,
  getLeadStatus,
  statusOptions,
  useStatusesStore,
} from '../stores/statusesStore'

export function useStatuses() {
  const resources = ensureStatusesLoaded()
  useObservable(resources.leadStatuses)
  useObservable(resources.dealStatuses)
  useObservable(resources.communicationStatuses)
  useStatusesStore((state) => state.leadStatusesByName)
  useStatusesStore((state) => state.dealStatusesByName)

  return {
    leadStatuses: resources.leadStatuses,
    dealStatuses: resources.dealStatuses,
    communicationStatuses: resources.communicationStatuses,
    getLeadStatus,
    getDealStatus,
    getCommunicationStatus,
    statusOptions,
  }
}
