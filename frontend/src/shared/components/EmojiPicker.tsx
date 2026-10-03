import { useState, type ReactNode } from 'react'
import { gemoji } from 'gemoji'
import { Button, FormControl, Popover, type PopoverControls } from '@/design-system'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export interface EmojiPickerProps {
  value?: string
  onChange?: (emoji: string) => void
  reaction?: boolean
  onReactionChange?: (reaction: boolean) => void
  children?: (controls: PopoverControls) => ReactNode
}

function randomEmoji(): string {
  const index = Math.floor(Math.random() * gemoji.length)
  return gemoji[index]!.emoji
}

export function EmojiPicker({ value = '', onChange, reaction = false, onReactionChange, children }: EmojiPickerProps) {
  const [search, setSearch] = useState('')

  const groups: Record<string, typeof gemoji> = {}
  const needle = search.toLowerCase()
  for (const entry of gemoji) {
    if (search) {
      const keywords = [entry.description, ...entry.names, ...entry.tags].join(' ').toLowerCase()
      if (!keywords.includes(needle)) continue
    }
    ;(groups[entry.category] ??= []).push(entry)
  }
  if (!Object.keys(groups).length) groups['No results'] = []

  return (
    <Popover
      target={(controls) => children?.(controls) ?? <span className="text-base"> {value || ''} </span>}
      body={({ togglePopover }) =>
        reaction ? (
          <div className="flex items-center justify-center gap-2 rounded-full bg-surface-elevation-2 px-2 py-1 shadow-2xl ring-1 ring-black/5 focus:outline-none">
            {REACTION_EMOJIS.map((emoji) => (
              <div
                key={emoji}
                className="size-5 cursor-pointer rounded-full bg-surface-transparent text-2xl"
                onClick={() => {
                  onChange?.(emoji)
                  togglePopover()
                }}
              >
                <button>{emoji}</button>
              </div>
            ))}
            <Button
              className="rounded-full"
              icon="lucide-plus"
              onClick={(event) => {
                event.stopPropagation()
                onReactionChange?.(false)
              }}
            />
          </div>
        ) : (
          <div className="my-3 max-w-max transform bg-surface-base px-4 sm:px-0">
            <div className="relative max-h-96 min-w-40 overflow-y-auto rounded-lg bg-surface-elevation-2 pb-3 shadow-2xl ring-1 ring-black/5 focus:outline-none">
              <div className="flex gap-2 px-3 pb-1 pt-3">
                <div className="flex-1">
                  <FormControl
                    type="text"
                    placeholder="Search by keyword"
                    debounce={300}
                    value={search}
                    onChange={(next: string) => setSearch(next)}
                  />
                </div>
                <Button onClick={() => onChange?.(randomEmoji())}>Random</Button>
              </div>
              <div className="w-96" />
              {Object.entries(groups).map(([group, emojis]) => (
                <div key={group} className="px-3">
                  <div className="sticky top-0 bg-surface-elevation-2 pb-2 pt-3 text-sm text-ink-gray-7">{group}</div>
                  <div className="grid w-96 grid-cols-12 place-items-center">
                    {emojis.map((entry) => (
                      <button
                        key={entry.description}
                        className="h-8 w-8 rounded-md p-1 text-3xl hover:bg-surface-gray-2 focus:outline-none focus:ring focus:ring-blue-200"
                        title={entry.description}
                        onClick={() => {
                          onChange?.(entry.emoji)
                          togglePopover()
                        }}
                      >
                        {entry.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }
    />
  )
}
