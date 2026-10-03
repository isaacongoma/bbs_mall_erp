import { useRef, useState, type KeyboardEvent } from 'react'
import { __ } from '@/core/i18n'
import { Button, ErrorMessage } from '@/design-system'
import { useMeta } from '../../hooks/useMeta'
import { createDocument } from '../../utils/documents'
import { Link } from './Link'

export interface TableMultiselectInputProps {
  doctype: string
  values?: Array<Record<string, unknown>>
  onChange?: (values: Array<Record<string, unknown>>) => void
}

export function TableMultiselectInput({ doctype, values = [], onChange }: TableMultiselectInputProps) {
  const { getFields } = useMeta(doctype)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const valueButtons = useRef(new Map<string, HTMLButtonElement>())

  const linkField = getFields().find((field) => ['Link', 'User'].includes(field.fieldtype)) ?? null
  const fieldname = linkField?.fieldname ?? ''
  const missingLinkField = linkField ? null : __('Table MultiSelect requires a Table with at least one Link field')

  const parsedValues = linkField ? values.map((row) => String(row[fieldname])) : []
  const filters = linkField ? { name: ['not in', parsedValues] } : []

  function addValue(value: string) {
    setError(null)
    if (!linkField) return
    if (values.some((row) => row[fieldname] === value)) {
      setError(__('Value already exists'))
      return
    }
    if (value) {
      onChange?.([...values, { [fieldname]: value }])
      setQuery('')
    }
  }

  function removeValue(value: string) {
    onChange?.(values.filter((row) => row[fieldname] !== value))
  }

  function removeLastValue(event: KeyboardEvent) {
    if (event.key !== 'Backspace' && event.key !== 'Delete') return
    event.stopPropagation()
    if (query) return
    const last = parsedValues[parsedValues.length - 1]
    const lastButton = last ? valueButtons.current.get(last) : undefined
    if (document.activeElement === lastButton) {
      const next = values.slice(0, -1)
      onChange?.(next)
      requestAnimationFrame(() => {
        const newLast = next[next.length - 1]
        if (newLast) valueButtons.current.get(String(newLast[fieldname]))?.focus()
      })
    } else {
      lastButton?.focus()
    }
  }

  function create(value: string, close: () => void) {
    if (!linkField) return
    void createDocument(linkField.options as string, { name: value }, close, (document: { name?: string } | null) => {
      if (document?.name) addValue(document.name)
    })
  }

  const message = error ?? missingLinkField

  return (
    <div>
      <div className="group flex min-h-20 w-full flex-wrap gap-1 rounded bg-surface-gray-2 p-1.5 text-base text-ink-gray-8 transition-colors hover:bg-surface-gray-3 focus:border-outline-gray-4 focus:ring-0 focus-visible:ring-2 focus-visible:ring-outline-gray-3">
        {parsedValues.map((value) => (
          <Button
            key={value}
            ref={(node) => {
              if (node) valueButtons.current.set(value, node)
              else valueButtons.current.delete(value)
            }}
            label={value}
            theme="gray"
            variant="subtle"
            className="rounded bg-surface-base focus-visible:ring-outline-gray-4 hover:!bg-surface-gray-1"
            onKeyDownCapture={removeLastValue}
            suffix={
              <span
                className="lucide-x h-3.5"
                aria-hidden="true"
                onClick={(event) => {
                  event.stopPropagation()
                  removeValue(value)
                }}
              />
            }
          />
        ))}
        <div className="w-full">
          {linkField && (
            <Link
              className="form-control flex-1 cursor-text truncate"
              value={query}
              filters={filters}
              doctype={linkField.options as string}
              onCreate={create}
              hideMe
              onChange={addValue}
              target={({ togglePopover }) => (
                <button
                  className="h-7 w-full cursor-text"
                  onClick={(event) => {
                    event.stopPropagation()
                    togglePopover()
                  }}
                />
              )}
            />
          )}
        </div>
      </div>
      {message && <ErrorMessage className="mt-2 pl-2" message={message} />}
    </div>
  )
}
