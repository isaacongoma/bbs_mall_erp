import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'
import type { BaseSuggestionItem } from '../extensions/shared/suggestion-types'

export interface SuggestionListItemProps {
  item: BaseSuggestionItem
  index: number
  selected?: boolean
  itemClass?: string
  onSelect: () => void
  onHover: () => void
  children?: ReactNode
}

export function SuggestionListItem({
  item,
  index,
  selected = false,
  itemClass,
  onSelect,
  onHover,
  children,
}: SuggestionListItemProps) {
  return (
    <button
      type="button"
      data-suggestion-index={index}
      className={cn(
        'flex w-full items-center whitespace-nowrap rounded px-2 py-1.5 text-sm text-ink-gray-9',
        selected && 'bg-surface-gray-2',
        itemClass,
      )}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      onMouseOver={onHover}
    >
      {children ?? <span>{item.display ?? item.title ?? item.name ?? ''}</span>}
    </button>
  )
}
