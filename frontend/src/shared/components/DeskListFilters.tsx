import { useState, type ReactNode } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dropdown, FormControl, Popover } from '@/design-system'
import { Icon } from './Icon'
import { Link } from './Controls/Link'
import type { DocField } from '../types/meta'
import { FILTER_OPERATORS, selectOptions, type ListFilter } from '../utils/listFilters'

interface FilterPopoverProps {
  fields: DocField[]
  filters: ListFilter[]
  onApply: (filters: ListFilter[]) => void
  count: number
  trigger?: (controls: { toggle: () => void }) => ReactNode
}

const NUMERIC = ['Int', 'Float', 'Currency', 'Percent', 'Date', 'Datetime']

function ValueInput({
  field,
  filter,
  onChange,
}: {
  field: DocField | undefined
  filter: ListFilter
  onChange: (value: string) => void
}) {
  if (filter.op === 'is') {
    return (
      <FormControl
        type="select"
        value={filter.value}
        options={[
          { label: __('Set'), value: 'set' },
          { label: __('Not Set'), value: 'not set' },
        ]}
        onChange={(value: unknown) => onChange(String(value))}
      />
    )
  }
  if (field && (field.fieldtype === 'Select' || field.fieldtype === 'Check')) {
    return (
      <FormControl
        type="select"
        value={filter.value}
        options={selectOptions(field)}
        onChange={(value: unknown) => onChange(String(value ?? ''))}
      />
    )
  }
  if (field?.fieldtype === 'Link' && field.options) {
    return (
      <Link
        doctype={String(field.options)}
        value={filter.value}
        onChange={(value: unknown) => onChange(String(value ?? ''))}
      />
    )
  }
  const type =
    field && field.fieldtype === 'Date'
      ? 'date'
      : field && NUMERIC.includes(field.fieldtype) && field.fieldtype !== 'Datetime'
        ? 'number'
        : 'text'
  return <FormControl type={type} value={filter.value} onChange={(value: unknown) => onChange(String(value ?? ''))} />
}

export function FilterPopover({ fields, filters, onApply, count, trigger }: FilterPopoverProps) {
  const [draft, setDraft] = useState<ListFilter[]>(filters)
  const fieldOptions = [
    { label: __('ID'), value: 'name' },
    ...fields.map((field) => ({ label: __(field.label ?? field.fieldname), value: field.fieldname })),
  ]

  function update(index: number, patch: Partial<ListFilter>) {
    setDraft((current) => current.map((entry, position) => (position === index ? { ...entry, ...patch } : entry)))
  }

  return (
    <Popover
      placement="bottom-end"
      onOpenChange={(open) => {
        if (open) setDraft(filters.length ? filters : [])
      }}
      target={({ togglePopover }) =>
        trigger ? (
          trigger({ toggle: togglePopover })
        ) : (
          <div className="flex h-8 items-center overflow-hidden rounded-lg bg-surface-gray-2">
            <button
              type="button"
              onClick={() => togglePopover()}
              className="flex h-full items-center gap-1.5 px-2 text-base text-ink-gray-8 hover:bg-surface-gray-3"
            >
              <Icon icon="lucide-filter" className="size-4" />
              <span>{count ? __('Filters') : __('Filter')}</span>
              {count > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-surface-white text-sm text-ink-gray-8">
                  {count}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label={__('Clear Filters')}
              onClick={() => onApply([])}
              className="flex h-full w-[33px] items-center justify-center border-l border-outline-gray-3 hover:bg-surface-gray-3"
            >
              <Icon icon="lucide-x" className="size-4" />
            </button>
          </div>
        )
      }
      body={({ close }) => (
        <div className="w-[640px] max-w-[92vw] rounded-2xl bg-surface-white p-4 shadow-2xl ring-1 ring-black/5">
          {draft.length === 0 && <p className="px-1 pb-3 text-base text-ink-gray-5">{__('No filters applied')}</p>}
          <div className="flex flex-col gap-2">
            {draft.map((entry, index) => {
              const field = fields.find((candidate) => candidate.fieldname === entry.field)
              return (
                <div key={index} className="grid grid-cols-[1.2fr_0.9fr_1.2fr_auto] items-center gap-2">
                  <FormControl
                    type="select"
                    value={entry.field}
                    options={fieldOptions}
                    onChange={(value: unknown) => update(index, { field: String(value), value: '' })}
                  />
                  <FormControl
                    type="select"
                    value={entry.op}
                    options={FILTER_OPERATORS.map((operator) => ({ label: __(operator.label), value: operator.value }))}
                    onChange={(value: unknown) => update(index, { op: String(value) })}
                  />
                  <ValueInput field={field} filter={entry} onChange={(value) => update(index, { value })} />
                  <button
                    type="button"
                    aria-label={__('Remove filter')}
                    onClick={() => setDraft((current) => current.filter((_, position) => position !== index))}
                    className="flex size-8 items-center justify-center rounded text-ink-gray-6 hover:bg-surface-gray-2"
                  >
                    <Icon icon="lucide-x" className="size-4" />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-outline-gray-2 pt-3">
            <button
              type="button"
              className="text-base text-ink-gray-6 hover:text-ink-gray-9"
              onClick={() =>
                setDraft((current) => [...current, { field: fields[0]?.fieldname ?? 'name', op: '=', value: '' }])
              }
            >
              + {__('Add a Filter')}
            </button>
            <div className="flex items-center gap-2">
              <Button
                variant="subtle"
                label={__('Clear Filters')}
                onClick={() => {
                  setDraft([])
                  onApply([])
                  close()
                }}
              />
              <Button
                variant="solid"
                label={__('Apply Filters')}
                onClick={() => {
                  onApply(draft)
                  close()
                }}
              />
            </div>
          </div>
        </div>
      )}
    />
  )
}

interface SortControlProps {
  options: Array<{ label: string; value: string }>
  field: string
  descending: boolean
  onChange: (field: string, descending: boolean) => void
}

export function SortControl({ options, field, descending, onChange }: SortControlProps) {
  const current = options.find((option) => option.value === field)
  return (
    <div className="flex items-center overflow-hidden rounded-lg bg-surface-gray-2">
      <button
        type="button"
        aria-label={descending ? __('Descending') : __('Ascending')}
        onClick={() => onChange(field, !descending)}
        className="flex h-8 w-8 items-center justify-center border-r border-outline-gray-3 hover:bg-surface-gray-3"
      >
        <Icon
          icon={descending ? 'lucide-arrow-down-wide-narrow' : 'lucide-arrow-up-narrow-wide'}
          className="size-4 text-ink-gray-7"
        />
      </button>
      <Dropdown
        placement="right"
        options={options.map((option) => ({ label: option.label, onClick: () => onChange(option.value, descending) }))}
      >
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 px-2 text-base text-ink-gray-8 hover:bg-surface-gray-3"
        >
          <span>{current?.label ?? field}</span>
          <Icon icon="lucide-chevron-down" className="size-4" />
        </button>
      </Dropdown>
    </div>
  )
}
