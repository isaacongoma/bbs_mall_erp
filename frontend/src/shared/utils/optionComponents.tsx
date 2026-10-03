import { FeatherIcon, LucideIcon, cn } from '@/design-system'
import type { MouseEvent } from 'react'

export interface DropdownOptionProps {
  option: string
  icon?: string
  selected?: boolean
  onClick?: (event: MouseEvent) => void
}

export function DropdownOption({ option, icon, selected, onClick }: DropdownOptionProps) {
  return (
    <button
      type="button"
      className="group flex w-full items-center justify-between rounded-md px-2 py-2 text-sm text-ink-gray-8 hover:bg-surface-gray-2"
      onClick={onClick}
    >
      <div className="flex gap-2">
        {icon ? <FeatherIcon name={icon} className="h-4 w-4 shrink-0" aria-hidden /> : null}
        <span className="whitespace-nowrap">{option}</span>
      </div>
      {selected ? <LucideIcon name="check" className="h-4 w-4 shrink-0 text-ink-gray-7" /> : null}
    </button>
  )
}

export interface TemplateOptionProps {
  active?: boolean
  option: string
  variant?: string
  icon?: string
  onClick?: (event: MouseEvent) => void
}

export function TemplateOption({ active, option, variant, icon, onClick }: TemplateOptionProps) {
  return (
    <button
      type="button"
      className={cn(
        active ? 'bg-surface-gray-2' : 'text-ink-gray-7',
        'group flex w-full items-center gap-2 rounded-md px-2 py-2 text-base hover:bg-surface-gray-3',
        variant === 'danger' && 'text-ink-red-6 hover:bg-ink-red-1',
      )}
      onClick={onClick}
    >
      {icon ? <FeatherIcon name={icon} className="h-4 w-4 shrink-0" aria-hidden /> : null}
      <span className="whitespace-nowrap">{option}</span>
    </button>
  )
}
