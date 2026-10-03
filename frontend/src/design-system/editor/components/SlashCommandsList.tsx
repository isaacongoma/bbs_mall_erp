import type { Ref } from 'react'
import { LucideIcon } from '../../icons'
import type { SuggestionListExpose } from '../extensions/shared/suggestion-types'
import type { CommandItem } from '../extensions/slash-commands/slash-commands-extension'
import { SuggestionList } from './SuggestionList'

export interface SlashCommandsListProps {
  items: CommandItem[]
  command: (item: CommandItem) => void
  ref?: Ref<SuggestionListExpose>
}

export function SlashCommandsList({ items, command, ref }: SlashCommandsListProps) {
  return (
    <SuggestionList<CommandItem>
      ref={ref}
      items={items}
      command={(item) => {
        if (item) command(item)
      }}
      containerClass="min-w-48"
      itemClass="h-7"
      showNoResults
      renderItem={(item) => (
        <>
          {item.icon ? <LucideIcon name={item.icon} className="mr-2 h-4 w-4" /> : <div className="mr-2 h-4 w-4" />}
          <span>{item.title}</span>
        </>
      )}
    />
  )
}
