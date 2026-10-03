import { Popover, cn } from '@/design-system'

export interface PopoverSelectOption {
  label: string
  value: string | number
}

export interface PopoverSelectProps {
  options: PopoverSelectOption[]
  value: string | number
  onChange: (value: string) => void
  placement?: 'bottom-start' | 'bottom-end'
  triggerClassName?: string
  bodyClassName?: string
  optionClassName?: string
}

export function PopoverSelect({
  options,
  value,
  onChange,
  placement,
  triggerClassName,
  bodyClassName,
  optionClassName,
}: PopoverSelectProps) {
  return (
    <Popover
      placement={placement}
      target={({ togglePopover }) => (
        <div
          className={cn(
            'flex h-7 w-full items-center justify-between rounded border border-outline-gray-2 bg-surface-gray-2 py-1.5 pl-2 pr-2 text-base text-ink-gray-8 transition-colors hover:border-outline-elevation-2 hover:bg-surface-gray-3 dark:[color-scheme:dark]',
            triggerClassName,
          )}
          onClick={() => togglePopover()}
        >
          <div>{options.find((option) => String(option.value) === String(value))?.label}</div>
          <span className="lucide-chevron-down size-4" aria-hidden="true" />
        </div>
      )}
      body={({ togglePopover }) => (
        <div className={cn('rounded bg-surface-base p-1 text-ink-gray-6 shadow-2xl', bodyClassName)}>
          {options.map((option) => (
            <div
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded p-2 text-base hover:bg-surface-gray-1',
                optionClassName,
              )}
              onClick={() => {
                onChange(String(option.value))
                togglePopover()
              }}
            >
              {option.label}
              {String(value) === String(option.value) && <span className="lucide-check size-4" aria-hidden="true" />}
            </div>
          ))}
        </div>
      )}
    />
  )
}
