import { __ } from '@/core/i18n'
import type { ReportFilterDef } from '../frappe/queryReport'
import { Icon } from './Icon'
import { Link } from './Controls/Link'

export function ReportFilterControl({
  filter,
  value,
  invalid,
  onChange,
}: {
  filter: ReportFilterDef
  value: unknown
  invalid?: boolean
  onChange: (value: unknown) => void
}) {
  const label = filter.label ? __(filter.label) : undefined
  const strong = filter.reqd || (filter as { bold?: unknown }).bold ? 'font-semibold text-ink-gray-9' : ''
  const box = `h-7 w-full rounded-sm border ${invalid ? 'border-ink-red-3' : 'border-outline-gray-2'} bg-surface-base px-2 text-base text-ink-gray-8 py-0 leading-7 placeholder:text-ink-gray-4 focus:ring-0`
  const optionList = (): Array<{ label: string; value: string }> => {
    const raw = filter.options as unknown
    const items: unknown[] = Array.isArray(raw)
      ? raw
      : typeof raw === 'string'
        ? raw.split(String.fromCharCode(10))
        : raw && typeof raw === 'object'
          ? Object.keys(raw)
          : []
    return items.map((item) =>
      item && typeof item === 'object'
        ? {
            label: String((item as Record<string, unknown>).label ?? (item as Record<string, unknown>).value ?? ''),
            value: String((item as Record<string, unknown>).value ?? ''),
          }
        : { label: String(item ?? ''), value: String(item ?? '') },
    )
  }
  if (filter.fieldtype === 'Break') return <div className="basis-full" />
  if (filter.fieldtype === 'Select' || filter.fieldtype === 'Autocomplete') {
    return (
      <div className="relative">
        <select
          className={`${box} appearance-none pr-6 ${strong} ${value ? '' : 'text-ink-gray-4'}`}
          value={String(value ?? '')}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        >
          {(optionList().some((option) => option.value === '')
            ? optionList()
            : [{ label: '', value: '' }, ...optionList()]
          ).map((option) => (
            <option key={option.value} value={option.value}>
              {option.value ? __(option.label) : label}
            </option>
          ))}
        </select>
        <Icon
          icon="lucide-chevrons-up-down"
          className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-gray-5"
        />
      </div>
    )
  }
  if (filter.fieldtype === 'Check') {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink-gray-9">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked ? 1 : 0)} />
        {label}
      </label>
    )
  }
  if (filter.fieldtype === 'Link' && filter.options)
    return (
      <Link
        doctype={filter.options}
        value={String(value ?? '')}
        placeholder={label}
        onChange={onChange}
        target={({ togglePopover }) => (
          <button
            type="button"
            onClick={() => togglePopover()}
            className={`${box} truncate text-left ${value ? strong : 'text-ink-gray-4'}`}
          >
            {String(value || label || '')}
          </button>
        )}
      />
    )
  if (filter.fieldtype === 'Date') {
    const raw = String(value ?? '')
    const scope = window as unknown as Record<string, any>
    const shown = raw && scope.frappe?.datetime?.str_to_user ? String(scope.frappe.datetime.str_to_user(raw)) : raw
    return (
      <input
        className={`${box} ${strong}`}
        type="text"
        placeholder={label}
        aria-label={label}
        defaultValue={shown}
        key={raw}
        onFocus={(event) => {
          event.currentTarget.type = 'date'
          event.currentTarget.value = raw
        }}
        onBlur={(event) => {
          const next = event.currentTarget.value
          event.currentTarget.type = 'text'
          if (next !== raw) onChange(next)
        }}
      />
    )
  }
  return (
    <input
      className={`${box} ${strong}`}
      type="text"
      placeholder={label}
      aria-label={label}
      value={String(value ?? '')}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
