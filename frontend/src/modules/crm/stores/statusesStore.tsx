import { create } from 'zustand'
import { __ } from '@/core/i18n'
import { createListResource, type ListResource } from '@/core/resources'
import { capture } from '@/core/telemetry'
import { IndicatorIcon } from '@/shared/components/Icons'
import { parseColor } from '@/shared/utils/colors'
import { isTranslatable } from '@/shared/utils/cache'

export interface CrmStatus {
  name: string
  color: string
  position?: number
  type?: string
}

interface StatusesState {
  leadStatusesByName: Record<string, CrmStatus>
  dealStatusesByName: Record<string, CrmStatus>
  communicationStatusesByName: Record<string, { name: string }>
}

export const useStatusesStore = create<StatusesState>(() => ({
  leadStatusesByName: {},
  dealStatusesByName: {},
  communicationStatusesByName: {},
}))

interface StatusResources {
  leadStatuses: ListResource
  dealStatuses: ListResource
  communicationStatuses: ListResource
}

let resources: StatusResources | null = null

function transformStatuses(statuses: CrmStatus[], key: 'leadStatusesByName' | 'dealStatusesByName'): CrmStatus[] {
  const byName: Record<string, CrmStatus> = {}
  const next = statuses.map((status) => {
    const parsed = { ...status, color: parseColor(status.color) }
    byName[parsed.name] = parsed
    return parsed
  })
  useStatusesStore.setState({ [key]: byName })
  return next
}

export function ensureStatusesLoaded(): StatusResources {
  if (resources) return resources

  const leadStatuses = createListResource({
    doctype: 'CRM Lead Status',
    fields: ['name', 'color', 'position', 'type'],
    orderBy: 'position asc',
    cache: 'lead-statuses',
    auto: true,
    transform: (statuses: CrmStatus[]) => transformStatuses(statuses, 'leadStatusesByName'),
  })

  const dealStatuses = createListResource({
    doctype: 'CRM Deal Status',
    fields: ['name', 'color', 'position', 'type'],
    orderBy: 'position asc',
    cache: 'deal-statuses',
    auto: true,
    transform: (statuses: CrmStatus[]) => transformStatuses(statuses, 'dealStatusesByName'),
  })

  const communicationStatuses = createListResource({
    doctype: 'CRM Communication Status',
    fields: ['name'],
    cache: 'communication-statuses',
    auto: true,
    transform: (statuses: Array<{ name: string }>) => {
      const byName: Record<string, { name: string }> = {}
      for (const status of statuses) byName[status.name] = status
      useStatusesStore.setState({ communicationStatusesByName: byName })
      return statuses
    },
  })

  resources = { leadStatuses, dealStatuses, communicationStatuses }
  return resources
}

export function getLeadStatus(name?: string | null): CrmStatus | undefined {
  const { leadStatuses } = ensureStatusesLoaded()
  const key = name || leadStatuses.data?.[0]?.name
  return key ? useStatusesStore.getState().leadStatusesByName[key] : undefined
}

export function getDealStatus(name?: string | null): CrmStatus | undefined {
  const { dealStatuses } = ensureStatusesLoaded()
  const key = name || dealStatuses.data?.[0]?.name
  return key ? useStatusesStore.getState().dealStatusesByName[key] : undefined
}

export function getCommunicationStatus(name?: string | null): { name: string } | undefined {
  const { communicationStatuses } = ensureStatusesLoaded()
  const key = name || communicationStatuses.data?.[0]?.name
  return key ? useStatusesStore.getState().communicationStatusesByName[key] : undefined
}

export interface StatusOption {
  label: string
  value: string
  icon: (props: { className?: string }) => React.ReactElement
  onClick: () => Promise<void>
}

const iconCache = new Map<string, StatusOption['icon']>()

function statusIcon(color: string): StatusOption['icon'] {
  let icon = iconCache.get(color)
  if (!icon) {
    icon = (props) => <IndicatorIcon className={[color, props.className].filter(Boolean).join(' ')} />
    iconCache.set(color, icon)
  }
  return icon
}

export function statusOptions(
  doctype: 'lead' | 'deal',
  statuses: string[] = [],
  triggerStatusChange: ((status: string) => unknown) | null = null,
): StatusOption[] {
  const state = useStatusesStore.getState()
  let byName: Record<string, CrmStatus | undefined> =
    doctype === 'deal' ? state.dealStatusesByName : state.leadStatusesByName

  if (statuses?.length) {
    byName = statuses.reduce<Record<string, CrmStatus | undefined>>((acc, status) => {
      acc[status] = byName[status]
      return acc
    }, {})
  }

  const translatable = isTranslatable(doctype === 'deal' ? 'CRM Deal Status' : 'CRM Lead Status')

  return Object.keys(byName).map((status) => {
    const entry = byName[status]
    const name = entry?.name ?? status
    return {
      label: translatable ? __(name) : name,
      value: name,
      icon: statusIcon(entry?.color ?? ''),
      onClick: async () => {
        await triggerStatusChange?.(name)
        capture('status_changed', { doctype, status })
      },
    }
  })
}
