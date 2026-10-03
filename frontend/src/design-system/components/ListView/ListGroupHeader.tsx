import type { ReactNode } from 'react'
import { useListView } from '../../hooks/useListView'
import type { ListGroupData } from '../../types/listView'
import { cn } from '../../utils/cn'

export interface ListGroupHeaderProps {
  group: ListGroupData
  children?: ReactNode
}

export function ListGroupHeader({ group, children }: ListGroupHeaderProps) {
  const list = useListView()
  const collapsed = list.isGroupCollapsed(group)

  return (
    <>
      <div className="flex items-center">
        <button
          type="button"
          aria-label={collapsed ? 'Expand group' : 'Collapse group'}
          aria-expanded={!collapsed}
          onClick={() => list.toggleGroup(group)}
          className="ms-[3px] me-[11px] rounded p-1 hover:bg-surface-gray-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 16 16"
            className={cn('h-4 w-4 text-ink-gray-6 transition-transform duration-200', collapsed && '-rotate-90')}
          >
            <path
              fill="currentColor"
              d="M4.293 5.28h7.413a.5.5 0 0 1 .41.787l-3.707 5.295a.5.5 0 0 1-.82 0L3.884 6.067a.5.5 0 0 1 .41-.787Z"
            />
          </svg>
        </button>
        {children ?? (
          <div className="w-full py-1.5 pe-2">
            {list.renderers.groupHeader ? (
              list.renderers.groupHeader({ group })
            ) : (
              <span className="text-ink-gray-8 text-base-medium leading-6">{group.group}</span>
            )}
          </div>
        )}
      </div>
      <div className="mx-2 h-px border-t border-outline-elevation-2" />
    </>
  )
}
