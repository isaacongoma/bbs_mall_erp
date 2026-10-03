import type { ComponentType } from 'react'
import { __ } from '@/core/i18n'
import { GroupByIcon, KanbanIcon, ListIcon } from '@/shared/components/Icons'
import { getViewDetails, type CrmView } from '@/shared/stores/viewsStore'

export interface StandardView {
  label: string
  icon: ComponentType<{ className?: string }>
}

function standardView(type: string): StandardView {
  const types: Record<string, StandardView> = {
    list: { label: __('List'), icon: ListIcon },
    group_by: { label: __('Group By'), icon: GroupByIcon },
    kanban: { label: __('Kanban'), icon: KanbanIcon },
  }
  return types[type] ?? (types.list as StandardView)
}

export function getView(
  view: string | null | undefined,
  type?: string | null,
  doctype?: string | null,
): CrmView | StandardView {
  const viewType = type || 'list'
  const details = getViewDetails(view, viewType, doctype ?? null)
  if (details) return details.icon ? details : { ...details, icon: standardView(viewType).icon }
  return standardView(viewType)
}
