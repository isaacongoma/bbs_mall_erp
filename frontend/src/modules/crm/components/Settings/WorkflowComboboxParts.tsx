import { cn } from '@/design-system'

type AnyRecord = Record<string, any>

export function WorkflowComboboxIcon({ item }: { item: AnyRecord }) {
  if (!item.icon) return null
  return <span className={cn(item.icon, 'size-4 shrink-0', item.tone || 'text-ink-gray-6')} aria-hidden="true" />
}

export function WorkflowComboboxOption({ item }: { item: AnyRecord }) {
  return (
    <div className="min-w-0">
      <div className="truncate">{item.label}</div>
      {item.description && <div className="truncate text-p-sm text-ink-gray-5">{item.description}</div>}
    </div>
  )
}
