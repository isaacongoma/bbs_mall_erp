import { useEffect, useImperativeHandle, useMemo, useRef, type ReactNode, type Ref } from 'react'
import { useSuggestionList } from '../hooks/useSuggestionList'
import type { BaseSuggestionItem, SuggestionListExpose } from '../extensions/shared/suggestion-types'
import { cn } from '../../utils/cn'
import { EditorPopover } from './EditorPopover'
import { SuggestionListItem } from './SuggestionListItem'

export interface SuggestionListProps<T extends BaseSuggestionItem = BaseSuggestionItem> {
  items: T[]
  command: (item: T) => void
  containerClass?: string
  itemClass?: string
  showNoResults?: boolean
  renderItem?: (item: T, index: number) => ReactNode
  ref?: Ref<SuggestionListExpose>
}

interface Group<T> {
  label?: string
  entries: { item: T; index: number }[]
}

export function SuggestionList<T extends BaseSuggestionItem = BaseSuggestionItem>({
  items,
  command,
  containerClass,
  itemClass,
  showNoResults = false,
  renderItem,
  ref,
}: SuggestionListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { selectedIndex, setSelectedIndex, onKeyDown } = useSuggestionList<T>(items, command)

  const groups = useMemo(() => {
    const result: Group<T>[] = []
    items.forEach((item, index) => {
      const label = typeof item.group === 'string' ? item.group : undefined
      const last = result[result.length - 1]
      if (last && last.label === label) last.entries.push({ item, index })
      else result.push({ label, entries: [{ item, index }] })
    })
    return result
  }, [items])

  useImperativeHandle(ref, () => ({ onKeyDown }), [onKeyDown])

  useEffect(() => {
    containerRef.current
      ?.querySelector<HTMLElement>(`[data-suggestion-index="${selectedIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!items.length && !showNoResults) return <div />

  return (
    <div>
      <EditorPopover
        dialogLabel="Suggestions"
        autofocus={false}
        trapped={false}
        loop={false}
        contentClass={cn('relative max-h-[300px] min-w-40 overflow-y-auto rounded-lg p-1 text-base', containerClass)}
      >
        <div ref={containerRef}>
          {items.length ? (
            groups.map((group, groupIndex) => (
              <div key={group.label ?? groupIndex}>
                {group.label && (
                  <div className="flex h-7 items-center px-2 text-sm-medium text-ink-gray-4">{group.label}</div>
                )}
                {group.entries.map(({ item, index }) => (
                  <SuggestionListItem
                    key={index}
                    item={item}
                    index={index}
                    selected={index === selectedIndex}
                    itemClass={itemClass}
                    onSelect={() => command(item)}
                    onHover={() => setSelectedIndex(index)}
                  >
                    {renderItem?.(item, index)}
                  </SuggestionListItem>
                ))}
              </div>
            ))
          ) : (
            <div className="px-3 py-1.5 text-sm text-ink-gray-5">No results</div>
          )}
        </div>
      </EditorPopover>
    </div>
  )
}
