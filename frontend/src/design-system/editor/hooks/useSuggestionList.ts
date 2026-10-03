import { useCallback, useState } from 'react'
import { useLatest } from '../../hooks/useLatest'

export function useSuggestionList<T>(items: T[], onSelect: (item: T) => void) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [previousItems, setPreviousItems] = useState(items)
  if (previousItems !== items) {
    setPreviousItems(items)
    setSelectedIndex(0)
  }

  const latest = useLatest({ items, selectedIndex, onSelect })

  const onKeyDown = useCallback(
    ({ event }: { event: KeyboardEvent }): boolean => {
      const { items: current, selectedIndex: index, onSelect: select } = latest()
      const count = current.length
      if (!count) return false

      if (event.key === 'ArrowUp') {
        setSelectedIndex((index + count - 1) % count)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((index + 1) % count)
        return true
      }
      if (event.key === 'Enter') {
        const item = current[index]
        if (item !== undefined) select(item)
        return true
      }
      return false
    },
    [latest],
  )

  return { selectedIndex, setSelectedIndex, onKeyDown }
}
