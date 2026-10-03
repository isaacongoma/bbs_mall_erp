import { GridLayout } from '@/design-system'
import { DashboardItem } from './DashboardItem'

type AnyRecord = Record<string, any>

export interface DashboardGridProps {
  items: AnyRecord[]
  onItemsChange: (items: AnyRecord[]) => void
  editing?: boolean
}

export function DashboardGrid({ items, onItemsChange, editing = false }: DashboardGridProps) {
  if (!items.length) return null

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <GridLayout
        className={`h-fit w-full ${editing ? 'mb-[20rem] !select-none' : ''}`}
        cols={20}
        rowHeight={42}
        disabled={!editing}
        value={items.map((item) => item.layout)}
        onChange={(layout) => {
          if (!editing) return
          onItemsChange(items.map((item, index) => ({ ...item, layout: layout[index] ?? item.layout })))
        }}
        renderItem={({ index }) => {
          const item = items[index]
          if (!item) return null
          return (
            <div className="group relative flex h-full w-full p-2 text-ink-gray-8">
              <div
                className={`flex h-full w-full items-center justify-center ${
                  editing
                    ? 'pointer-events-none [&>div:first-child]:rounded [&>div:first-child]:group-hover:ring-2 [&>div:first-child]:group-hover:ring-outline-gray-2'
                    : ''
                }`}
              >
                <DashboardItem item={item} editing={editing} />
              </div>
              {editing && (
                <div className="absolute right-0 top-0 flex cursor-pointer rounded bg-surface-gray-9 opacity-0 group-hover:opacity-100">
                  <div
                    className="rounded p-1 hover:bg-surface-gray-8"
                    onClick={() => onItemsChange(items.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <span className="lucide-trash-2 size-3 text-ink-base" aria-hidden="true" />
                  </div>
                </div>
              )}
            </div>
          )
        }}
      />
    </div>
  )
}
