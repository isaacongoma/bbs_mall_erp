import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Avatar, TextInput, cn } from '@/design-system'
import { LoadingIndicator } from '@/shared/components/Icons'

type AnyRecord = Record<string, any>

export interface HierarchyUserMultiSelectProps {
  value: string[]
  onChange: (value: string[]) => void
  candidates: AnyRecord[]
  loading?: boolean
  showMail?: boolean
}

export function HierarchyUserMultiSelect({
  value,
  onChange,
  candidates,
  loading = false,
  showMail = false,
}: HierarchyUserMultiSelectProps) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const filtered = needle
    ? candidates.filter(
        (user) => user.full_name?.toLowerCase().includes(needle) || user.email?.toLowerCase().includes(needle),
      )
    : candidates

  function toggle(user: AnyRecord) {
    onChange(value.includes(user.value) ? value.filter((id) => id !== user.value) : [...value, user.value])
  }

  return (
    <div className="flex flex-col">
      <div className="px-2 pt-1.5">
        <TextInput
          value={query}
          onChange={setQuery}
          debounce={200}
          placeholder={__('Search users')}
          prefix={<span className="lucide-search size-4 text-ink-gray-5" aria-hidden="true" />}
        />
      </div>
      {loading ? (
        <div className="my-2 flex min-h-32 items-center justify-center">
          <LoadingIndicator className="size-4 text-ink-gray-5" />
        </div>
      ) : filtered.length ? (
        <ul className="my-2 max-h-64 overflow-y-auto px-1.5">
          {filtered.map((user) => {
            const selected = value.includes(user.value)
            return (
              <li
                key={user.value}
                className={cn(
                  'mb-1 flex cursor-pointer items-center gap-2 rounded p-1.5 px-2 hover:bg-surface-gray-1',
                  selected && 'bg-surface-gray-3',
                )}
                onClick={() => toggle(user)}
              >
                <Avatar image={user.user_image} label={user.full_name} size="lg" />
                <div className="flex min-w-0 flex-1 flex-col items-start">
                  <span className="truncate text-sm-medium text-ink-gray-8">{user.full_name}</span>
                  {showMail ? (
                    <div className="flex min-w-0 flex-row items-center gap-2">
                      <span className="truncate text-p-sm text-ink-gray-7">{user.email}</span>
                      {user.role_label && (
                        <span className="shrink-0 truncate text-p-sm text-ink-gray-5">{user.role_label}</span>
                      )}
                    </div>
                  ) : (
                    user.role_label && <span className="truncate text-p-sm text-ink-gray-5">{user.role_label}</span>
                  )}
                </div>
                <span
                  className={cn('lucide-check ml-auto size-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')}
                  aria-hidden="true"
                />
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="my-2 flex min-h-32 items-center justify-center text-p-sm text-ink-gray-5">
          {__('No users found')}
        </div>
      )}
    </div>
  )
}
