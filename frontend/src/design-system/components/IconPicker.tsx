import * as RadixPopover from '@radix-ui/react-popover'
import { iconNames } from 'lucide-react/dynamic'
import { useMemo, useState, type FocusEvent } from 'react'
import { LucideIcon } from '../icons'
import { cn } from '../utils/cn'
import { PopoverPanel } from './Popover'

export interface IconPickerProps {
  variant?: 'subtle' | 'outline' | 'ghost'
  value?: string | null
  onChange?: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  openOnFocus?: boolean
  openOnClick?: boolean
  placement?: 'start' | 'center' | 'end'
  maxIcons?: number
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  onInput?: (term: string) => void
}

function getLabel(name: string): string {
  return name.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

const VARIANTS: Record<NonNullable<IconPickerProps['variant']>, string> = {
  subtle:
    'border focus-within:border-outline-gray-4 focus-within:ring-2 focus-within:ring-outline-gray-3 bg-surface-gray-2 hover:bg-surface-gray-3 border-transparent',
  outline:
    'border focus-within:border-outline-gray-4 focus-within:ring-2 focus-within:ring-outline-gray-3 border-outline-gray-2',
  ghost: '',
}

export function IconPicker({
  variant = 'subtle',
  value = null,
  onChange,
  placeholder,
  disabled = false,
  openOnFocus = true,
  openOnClick = true,
  placement = 'start',
  maxIcons = 100,
  onFocus,
  onBlur,
  onInput,
}: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState<string | null>(null)
  const [previousValue, setPreviousValue] = useState(value)

  if (previousValue !== value) {
    setPreviousValue(value)
    setTyped(null)
  }

  const searchTerm = typed ?? (value ? getLabel(value) : '')

  const filtered = useMemo(() => {
    if (!searchTerm) return iconNames
    const needle = searchTerm.toLowerCase()
    return iconNames.filter((name) => name.replace(/-/g, ' ').toLowerCase().includes(needle))
  }, [searchTerm])

  const select = (name: string) => {
    onChange?.(name)
    setTyped(null)
    setOpen(false)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setTyped(null)
  }

  return (
    <div className="relative">
      <RadixPopover.Root open={open} onOpenChange={handleOpenChange}>
        <RadixPopover.Anchor asChild>
          <div
            className={cn(
              'flex h-7 w-full items-center justify-between gap-2 rounded px-2 py-1 transition-colors',
              disabled && 'pointer-events-none opacity-50',
              VARIANTS[variant],
            )}
            onClick={() => {
              if (openOnClick) setOpen(true)
            }}
          >
            <div className="flex flex-1 items-center gap-2 overflow-hidden">
              <LucideIcon name={value || 'circle-dashed'} className="h-4 w-4 flex-shrink-0" />
              <input
                value={searchTerm}
                onChange={(event) => {
                  const next = event.target.value
                  setTyped(next)
                  if (next === '') onChange?.(null)
                  onInput?.(next)
                  setOpen(true)
                }}
                onFocus={(event) => {
                  if (openOnFocus) setOpen(true)
                  onFocus?.(event)
                }}
                onBlur={onBlur}
                className="h-full w-full border-0 bg-transparent p-0 text-base text-ink-gray-8 placeholder:text-ink-gray-4 focus:border-0 focus:outline-0 focus:ring-0"
                placeholder={placeholder || 'Select an icon...'}
                disabled={disabled}
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              disabled={disabled}
              tabIndex={-1}
              aria-label="Toggle icons"
              onClick={(event) => {
                event.stopPropagation()
                setOpen((current) => !current)
              }}
            >
              <LucideIcon name="chevron-down" className="h-4 w-4 text-ink-gray-5" />
            </button>
          </div>
        </RadixPopover.Anchor>
        <RadixPopover.Portal>
          <RadixPopover.Content
            className="z-[100] mt-1 w-60"
            align={placement}
            sideOffset={4}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <PopoverPanel motion="animated" className="origin-(--radix-popover-content-transform-origin)">
              <div className="max-h-60 overflow-auto p-2">
                {filtered.length === 0 ? (
                  <div className="px-2.5 py-1.5 text-center text-base text-ink-gray-5">
                    {searchTerm ? `No icons found for "${searchTerm}"` : 'No icons available.'}
                  </div>
                ) : (
                  <div className="flex flex-wrap">
                    {filtered.slice(0, maxIcons).map((name) => (
                      <button
                        key={name}
                        type="button"
                        title={getLabel(name)}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-surface-gray-3',
                          value === name && 'bg-surface-gray-3',
                        )}
                        onClick={() => select(name)}
                      >
                        <LucideIcon name={name} className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </PopoverPanel>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>
    </div>
  )
}
