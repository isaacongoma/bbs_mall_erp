import { useState } from 'react'
import { DatePicker, DateTimePicker, FormControl, TextInput } from '@/design-system'
import { useDebouncedCallback } from '../hooks/useDebouncedCallback'
import { getFormat } from '../utils/date'
import { Link } from './Controls/Link'

export interface QuickFilter {
  label: string
  fieldname: string
  fieldtype: string
  options?: any
  value?: any
}

export interface QuickFilterFieldProps {
  filter: QuickFilter
  onApplyQuickFilter: (filter: QuickFilter, value: unknown) => void
}

export function QuickFilterField({ filter, onApplyQuickFilter }: QuickFilterFieldProps) {
  const apply = (value: unknown) => onApplyQuickFilter(filter, value)
  const debouncedApply = useDebouncedCallback(apply, 500)

  const [draft, setDraft] = useState<string>(String(filter.value ?? ''))
  const [syncedValue, setSyncedValue] = useState(filter.value)
  if (syncedValue !== filter.value) {
    setSyncedValue(filter.value)
    setDraft(String(filter.value ?? ''))
  }

  if (filter.fieldtype === 'Check') {
    return (
      <FormControl
        type="checkbox"
        label={filter.label}
        value={Boolean(filter.value)}
        onChange={(checked: boolean) => apply(checked)}
      />
    )
  }

  if (filter.fieldtype === 'Select') {
    return (
      <FormControl
        type="select"
        className={`form-control cursor-pointer font-[inherit] [&_select]:cursor-pointer ${filter.value ? '' : '!text-ink-gray-4'}`}
        value={filter.value ?? ''}
        options={filter.options}
        placeholder={filter.label}
        side="bottom"
        onChange={(next: unknown) => apply(next)}
      />
    )
  }

  if (filter.fieldtype === 'Link') {
    return (
      <Link value={filter.value} doctype={filter.options} placeholder={filter.label} onChange={(data) => apply(data)} />
    )
  }

  if (filter.fieldtype === 'Date' || filter.fieldtype === 'Datetime') {
    const Picker = filter.fieldtype === 'Date' ? DatePicker : DateTimePicker
    return (
      <Picker
        className="border-none"
        value={filter.value ?? ''}
        placeholder={filter.label}
        format={
          filter.fieldtype === 'Date' ? getFormat('', '', true, false, false) : getFormat('', '', true, true, false)
        }
        onChange={(next) => apply(next)}
      />
    )
  }

  return (
    <TextInput
      type="text"
      value={draft}
      placeholder={filter.label}
      onChange={(next) => {
        setDraft(next)
        debouncedApply(next)
      }}
    />
  )
}
