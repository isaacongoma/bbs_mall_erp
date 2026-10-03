import type { Ref } from 'react'
import type { SuggestionListExpose } from '../extensions/shared/suggestion-types'
import type { EmojiItem } from '../extensions/emoji/emoji-extension'
import { SuggestionList } from './SuggestionList'

export interface EmojiListProps {
  items: EmojiItem[]
  command: (item: EmojiItem) => void
  ref?: Ref<SuggestionListExpose>
}

export function EmojiList({ items, command, ref }: EmojiListProps) {
  return (
    <SuggestionList<EmojiItem>
      ref={ref}
      items={items}
      command={(item) => {
        if (item) command(item)
      }}
      itemClass="py-2"
      showNoResults
      renderItem={(item) => (
        <>
          <span className="mr-2">{item.emoji}</span>
          <span>{item.name}</span>
        </>
      )}
    />
  )
}
