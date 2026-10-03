import { useEffect, useMemo, useState, type ReactNode, type Ref, useImperativeHandle } from 'react'
import { isTranslatableDoctype } from '@/core/boot'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import {
  Button,
  Combobox,
  useDebouncedValue,
  type ComboboxItemSlotProps,
  type ComboboxProps,
  type ComboboxSelectableOption,
} from '@/design-system'

export interface LinkOption extends ComboboxSelectableOption {
  value: string
}

export interface LinkHandle {
  reload: () => void
}

export interface LinkTargetApi {
  open: boolean
  togglePopover: () => void
}

type Placement = 'top' | 'bottom' | 'left' | 'right'
type Alignment = 'start' | 'center' | 'end'

export interface LinkProps {
  doctype: string
  filters?: unknown
  value?: string | null
  valueLabel?: string
  onChange?: (value: string) => void
  hideMe?: boolean
  variant?: ComboboxProps['variant']
  size?: ComboboxProps['size']
  label?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  placement?: string
  className?: string
  onCreate?: (query: string, close: () => void) => void
  target?: (api: LinkTargetApi) => ReactNode
  prefix?: () => ReactNode
  itemPrefix?: (props: ComboboxItemSlotProps) => ReactNode
  itemLabel?: (props: ComboboxItemSlotProps) => ReactNode
  handleRef?: Ref<LinkHandle>
}

const SEARCH_URL = 'frappe.desk.search.search_link'

function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parsePlacement(placement: string | undefined): { side: Placement; align: Alignment } {
  const [side = 'bottom', align = 'start'] = (placement ?? 'bottom-start').split('-')
  return { side: side as Placement, align: align as Alignment }
}

function toOptions(
  data: Array<{ label?: string; value: string; description?: string }> | null,
  doctype: string,
  hideMe: boolean,
): LinkOption[] {
  const options: LinkOption[] = (data ?? []).map((option) => ({
    label: option.label || option.value,
    value: option.value,
    description: stripHtml(option.description),
  }))
  if (!hideMe && doctype === 'User') options.unshift({ label: '@me', value: '@me' })
  return options
}

export function Link({
  doctype,
  filters = [],
  value = '',
  valueLabel,
  onChange,
  hideMe = false,
  variant = 'subtle',
  size = 'sm',
  label,
  required = false,
  placeholder,
  disabled = false,
  placement,
  className,
  onCreate,
  target,
  prefix,
  itemPrefix,
  itemLabel,
  handleRef,
}: LinkProps) {
  const [query, setQuery] = useState('')
  const [selectedOption, setSelectedOption] = useState<LinkOption | null>(null)
  const debouncedQuery = useDebouncedValue(query, 300)
  const filtersKey = JSON.stringify(filters)

  const resource = useResource<Array<{ label?: string; value: string; description?: string }>>({
    url: SEARCH_URL,
    method: 'POST',
    cache: [doctype, '', hideMe, filters],
    params: { txt: '', doctype, filters },
  })

  useEffect(() => {
    if (!doctype) return
    resource.update({ params: { txt: debouncedQuery, doctype, filters: JSON.parse(filtersKey) as unknown } })
    void resource.reload().catch(() => undefined)
  }, [resource, doctype, filtersKey, debouncedQuery])

  useImperativeHandle(handleRef, () => ({ reload: () => void resource.reload().catch(() => undefined) }), [resource])

  const translatable = isTranslatableDoctype(doctype)
  const current = value ?? ''

  const options = useMemo<LinkOption[]>(() => {
    const list = toOptions(resource.data, doctype, hideMe)
    if (selectedOption && !list.some((option) => option.value === selectedOption.value)) list.unshift(selectedOption)
    if (current && !list.some((option) => option.value === current)) {
      list.unshift({ label: valueLabel ?? (translatable ? __(current) : current), value: current })
    }
    return list
  }, [resource.data, doctype, hideMe, selectedOption, current, translatable, valueLabel])

  const { side, align } = parsePlacement(placement)

  return (
    <Combobox
      className={className}
      trigger={target ? ({ open, setOpen }) => <>{target({ open, togglePopover: () => setOpen(!open) })}</> : 'button'}
      value={current || null}
      options={options}
      query={query}
      onQueryChange={setQuery}
      onChange={(next) => {
        if (next === null || next === '') return
        onChange?.(String(next))
      }}
      onSelectedOptionChange={(option) => {
        if (option && option.type !== 'custom') {
          setSelectedOption({
            label: option.label,
            value: String(option.value),
            description: option.description,
          })
        }
      }}
      variant={variant}
      size={size}
      label={label}
      required={required}
      placeholder={placeholder}
      disabled={disabled}
      side={side}
      align={align}
      filterable={false}
      loading={resource.loading}
      emptyText={__('No results found')}
      prefix={prefix ? () => prefix() : undefined}
      itemPrefix={itemPrefix}
      itemLabel={
        itemLabel ??
        (({ item }) =>
          item.description ? (
            <div className="flex flex-col gap-1">
              <div className="flex-1 truncate font-semibold text-ink-gray-7">{item.label}</div>
              <div className="flex-1 truncate text-sm text-ink-gray-5">{item.description}</div>
            </div>
          ) : (
            <div className="flex-1 truncate text-ink-gray-7">{item.label}</div>
          ))
      }
      footer={({ query: typed, setOpen }) => (
        <div>
          {onCreate && (
            <Button
              variant="ghost"
              className="w-full !justify-start"
              label={__('Create New')}
              iconLeft="lucide-plus"
              onClick={() => onCreate(typed, () => setOpen(false))}
            />
          )}
          <Button
            variant="ghost"
            className="w-full !justify-start"
            label={__('Clear')}
            iconLeft="lucide-x"
            onClick={() => {
              setSelectedOption(null)
              onChange?.('')
              setOpen(false)
            }}
          />
        </div>
      )}
    />
  )
}
