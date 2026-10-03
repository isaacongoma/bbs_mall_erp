import { useState, type ComponentType } from 'react'
import { __ } from '@/core/i18n'
import { createResource } from '@/core/resources'
import { Badge, type ListRowData } from '@/design-system'
import { EmptyState, DocListView, type DocListConfig } from '@/shared/components/ListViews'
import type { ListBulkActions } from '@/shared/hooks/useListBulkActions'

type IconComponent = ComponentType<{ className?: string }>

const NO_BULK: ListBulkActions = { bulkActions: () => [], customListActions: [], modals: <></> }

export interface LinkedTab {
  label: string
  icon: IconComponent
  count?: number
  [key: string]: unknown
}

export function LinkedTabItem({ tab, selected }: { tab: LinkedTab; selected: boolean }) {
  const Icon = tab.icon
  return (
    <button
      className={`group flex items-center gap-2 border-b border-transparent py-2.5 text-base text-ink-gray-5 duration-300 ease-in-out hover:text-ink-gray-9 ${
        selected ? 'text-ink-gray-9' : ''
      }`}
    >
      {Icon && <Icon className="h-5" />}
      {__(tab.label)}
      <Badge
        className={`group-hover:bg-surface-gray-10 ${selected ? 'bg-surface-gray-10' : 'bg-gray-600'}`}
        variant="solid"
        theme="gray"
        size="sm"
      >
        {tab.count}
      </Badge>
    </button>
  )
}

export interface LinkedRecordsListProps {
  config: DocListConfig
  rows: ListRowData[]
  columns: Array<Record<string, any>>
  emptyName: string
  emptyIcon: IconComponent
}

export function LinkedRecordsList({ config, rows, columns, emptyName, emptyIcon }: LinkedRecordsListProps) {
  const [list] = useState(() => createResource({ url: 'linked.records' }, { defer: true }))

  if (!rows.length) return <EmptyState name={__(emptyName)} icon={emptyIcon} />

  return (
    <DocListView
      className="mt-4"
      config={config}
      rows={rows}
      columns={columns}
      list={list}
      bulk={NO_BULK}
      options={{ selectable: false, showTooltip: false }}
    />
  )
}
