import { useRef, useState } from 'react'
import { __ } from '@/core/i18n'
import { cn } from '@/design-system'

interface CodeControlProps {
  value: unknown
  disabled?: boolean
  description?: string
  onCommit: (value: string) => void
}

export function CodeControl({ value, disabled, description, onCommit }: CodeControlProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? String(value ?? '')
  const [expanded, setExpanded] = useState(false)
  const gutter = useRef<HTMLDivElement>(null)

  const lines = Math.max(1, text.split('\n').length)

  return (
    <div>
      <div
        className={cn(
          'flex overflow-hidden rounded-lg bg-surface-gray-2 font-mono text-sm text-ink-gray-8',
          expanded ? 'h-[640px]' : 'h-[375px]',
        )}
      >
        <div
          ref={gutter}
          className="w-14 shrink-0 select-none overflow-hidden bg-surface-gray-3/60 py-1 pr-3 text-right text-xs leading-[1.6] text-ink-gray-5"
          aria-hidden="true"
        >
          {Array.from({ length: lines }, (_, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </div>
        <textarea
          value={text}
          disabled={disabled}
          spellCheck={false}
          wrap="off"
          className="h-full min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-1 text-sm leading-[1.6] outline-none focus:ring-0"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (draft !== null && draft !== String(value ?? '')) onCommit(draft)
            setDraft(null)
          }}
          onScroll={(event) => {
            if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop
          }}
        />
      </div>
      {description ? <p className="mt-1.5 text-sm text-ink-gray-5">{description}</p> : null}
      <button
        type="button"
        className="mt-3 rounded-md bg-surface-gray-2 px-3 py-1.5 text-base text-ink-gray-8 hover:bg-surface-gray-3"
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? __('Collapse') : __('Expand')}
      </button>
    </div>
  )
}
