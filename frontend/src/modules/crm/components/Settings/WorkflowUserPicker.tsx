import { useEffect, useRef, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Avatar, MultiSelect } from '@/design-system'

type AnyRecord = Record<string, any>

export interface WorkflowUserPickerProps {
  value: string[]
  actionType: string
  fieldname: string
  doctype?: string
  params?: string
  label?: string
  required?: boolean
  onChange: (value: string[]) => void
}

const isToken = (value: unknown) => String(value || '').startsWith('@')

export function WorkflowUserPicker({
  value,
  actionType,
  fieldname,
  doctype = '',
  params = '{}',
  label = '',
  required = false,
  onChange,
}: WorkflowUserPickerProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState<{ label: string; value: string }[]>([])
  const request = useRef(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = ++request.current
      setLoading(true)
      rpc<AnyRecord[]>({
        url: 'frappe.automation_engine.api.get_param_options',
        params: { action_type: actionType, fieldname, doctype, params, search_text: query },
      })
        .then((users) => {
          if (current === request.current)
            setFetched(users.map((user) => ({ label: user.full_name || user.name, value: user.name })))
        })
        .catch(() => {
          if (current === request.current) setFetched([])
        })
        .finally(() => {
          if (current === request.current) setLoading(false)
        })
    }, 250)
    return () => clearTimeout(timer)
  }, [query, actionType, fieldname, doctype, params])

  const merged = new Map<string, { label: string; value: string }>(
    value.map((entry) => [entry, { label: entry, value: entry }]),
  )
  fetched.forEach((option) => merged.set(option.value, option))

  return (
    <MultiSelect
      value={value}
      label={label}
      required={required}
      variant="outline"
      options={[...merged.values()]}
      loading={loading}
      placeholder={__('Select users')}
      emptyText={__('No users found')}
      query={query}
      onQueryChange={setQuery}
      onChange={(next) => onChange(next.map(String))}
      itemPrefix={({ item }: { item: AnyRecord }) =>
        isToken(item.value) ? (
          <span className="lucide-at-sign size-4 text-ink-gray-6" aria-hidden="true" />
        ) : (
          <Avatar label={String(item.label)} size="sm" />
        )
      }
    />
  )
}
