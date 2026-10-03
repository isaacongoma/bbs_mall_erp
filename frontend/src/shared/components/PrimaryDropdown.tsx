import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, FeatherIcon, Popover } from '@/design-system'
import '../styles/primaryDropdown.css'
import { PrimaryDropdownItem, type PrimaryDropdownOption } from './PrimaryDropdownItem'

export interface PrimaryDropdownProps {
  value?: string | number
  placeholder?: string
  itemPlaceholder?: string
  options?: PrimaryDropdownOption[]
  validate?: ((value: string) => string | undefined | void) | null
  onCreate?: ((value: string) => Promise<unknown> | unknown) | null
  label?: string
}

export function PrimaryDropdown({
  value = '',
  placeholder = '',
  itemPlaceholder = '',
  options = [],
  validate = null,
  onCreate = null,
  label = '',
}: PrimaryDropdownProps) {
  const [draft, setDraft] = useState<PrimaryDropdownOption | null>(null)

  function addDraft() {
    setDraft({
      value: '',
      selected: false,
      onSave: async (option) => {
        const created = await onCreate?.(option.value)
        if (created) setDraft(null)
        return created
      },
      onDelete: () => setDraft(null),
    })
  }

  return (
    <Popover
      className="w-full min-w-0"
      target={({ isOpen, togglePopover }) => (
        <Button
          label={String(value)}
          className="dropdown-button flex w-full items-center !justify-between bg-surface-base !px-2.5 py-1.5 text-base text-ink-gray-8 transition-colors hover:bg-surface-base focus:bg-surface-base focus:outline-none focus:ring-0"
          onClick={() => togglePopover()}
          suffix={<FeatherIcon name={isOpen ? 'chevron-up' : 'chevron-down'} className="h-4 text-ink-gray-5" />}
        >
          {value ? (
            <div className="truncate">{value}</div>
          ) : (
            <div className="truncate text-base leading-5 text-ink-gray-4">{placeholder}</div>
          )}
        </Button>
      )}
      body={() => (
        <div className="my-2 w-72 space-y-1.5 divide-y divide-outline-gray-1 rounded-lg bg-surface-elevation-2 p-1.5 shadow-2xl ring-1 ring-black/5 focus:outline-none">
          <div className="space-y-1">
            {options.map((option) => (
              <PrimaryDropdownItem
                key={option.name || option.value}
                option={option}
                placeholder={itemPlaceholder}
                validate={validate}
              />
            ))}
            {draft && <PrimaryDropdownItem option={draft} placeholder={itemPlaceholder} validate={validate} />}
            {!options.length && !draft && (
              <div>
                <div className="p-1.5 pl-3 pr-4 text-base text-ink-gray-4">{__('No {0} available', [label])}</div>
              </div>
            )}
          </div>
          {!draft && (
            <div className="pt-1.5">
              <Button
                variant="ghost"
                className="w-full !justify-start"
                label={__('Create New')}
                iconLeft="lucide-plus"
                onClick={addDraft}
              />
            </div>
          )}
        </div>
      )}
    />
  )
}
