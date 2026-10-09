import { __ } from '@/core/i18n'

export interface DeskListGroup {
  value: string
  count: number
}

export interface DeskListGroupSidebarProps {
  fieldLabel: string
  groups: DeskListGroup[]
  selected: string
  onSelect: (value: string) => void
}

export function DeskListGroupSidebar({ fieldLabel, groups, selected, onSelect }: DeskListGroupSidebarProps) {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-outline-gray-2 bg-surface-gray-1 p-3 lg:block">
      <div className="mb-2 px-2 text-xs-medium uppercase text-ink-gray-5">{__('Group By: {0}', [__(fieldLabel)])}</div>
      <nav aria-label={__('Groups')} className="flex flex-col gap-1">
        <button
          type="button"
          className={`flex items-center justify-between rounded px-2 py-1.5 text-left text-sm ${
            selected === '' ? 'bg-surface-gray-3 text-ink-gray-9' : 'text-ink-gray-7 hover:bg-surface-gray-2'
          }`}
          aria-pressed={selected === ''}
          onClick={() => onSelect('')}
        >
          <span>{__('All')}</span>
          <span className="text-xs text-ink-gray-5">{groups.reduce((total, group) => total + group.count, 0)}</span>
        </button>
        {groups.map((group) => (
          <button
            key={group.value}
            type="button"
            className={`flex items-center justify-between rounded px-2 py-1.5 text-left text-sm ${
              selected === group.value ? 'bg-surface-gray-3 text-ink-gray-9' : 'text-ink-gray-7 hover:bg-surface-gray-2'
            }`}
            aria-pressed={selected === group.value}
            onClick={() => onSelect(group.value)}
          >
            <span className="truncate">{group.value}</span>
            <span className="ml-2 text-xs text-ink-gray-5">{group.count}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
