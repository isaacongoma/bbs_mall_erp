import type { ReactNode } from 'react'
import { useListView } from '../../hooks/useListView'
import { usePresence } from '../../hooks/usePresence'
import { cn } from '../../utils/cn'
import { Button } from '../Button'
import { Checkbox } from '../Checkbox'
import '../../styles/listView.css'

export interface ListSelectBannerContext {
  selections: Set<string | number>
  allRowsSelected: boolean
  selectAll: () => void
  unselectAll: () => void
}

export interface ListSelectBannerProps {
  className?: string
  actions?: (context: ListSelectBannerContext) => ReactNode
  children?: (context: ListSelectBannerContext) => ReactNode
}

export function ListSelectBanner({ className, actions, children }: ListSelectBannerProps) {
  const list = useListView()
  const { mounted, state } = usePresence(list.selections.size > 0, 300)
  if (!mounted) return null

  const context: ListSelectBannerContext = {
    selections: list.selections,
    allRowsSelected: list.allRowsSelected,
    selectAll: () => list.toggleAllRows(true),
    unselectAll: () => list.toggleAllRows(false),
  }

  return (
    <div
      data-slot="list-select-banner"
      data-state={state}
      className="absolute inset-x-0 bottom-6 mx-auto w-max text-base"
    >
      <div
        className={cn(
          'flex min-w-[596px] items-center gap-3 rounded-lg bg-surface-base px-4 py-2 shadow-2xl',
          className,
        )}
      >
        {children ? (
          children(context)
        ) : (
          <>
            <div className="flex flex-1 justify-between border-r border-outline-gray-2 text-ink-gray-9">
              <div className="flex items-center gap-3">
                <Checkbox value disabled onChange={() => undefined} className="text-ink-gray-9" />
                <div>{list.options.selectionText(list.selections.size)}</div>
              </div>
              <div className="me-3">{actions?.(context)}</div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                className={cn('w- text-ink-gray-7', list.allRowsSelected && 'cursor-not-allowed')}
                disabled={list.allRowsSelected}
                variant="ghost"
                onClick={context.selectAll}
              >
                Select all
              </Button>
              <Button icon="lucide-x" label="Clear selection" variant="ghost" onClick={context.unselectAll} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
