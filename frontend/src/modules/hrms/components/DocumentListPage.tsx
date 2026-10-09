import { useMemo, useState } from 'react'
import { __ } from '@/core/i18n'
import { Badge, Button, ItemListRow, Select, Spinner, TextInput } from '@/design-system'
import { EmptyState } from '@/shared/components/ListViews/EmptyState'
import type { HrmsRequest } from '../types'
import { filterHrmsDocuments, formatHrmsListField } from '../utils/list'
import { RequestDetailDialog } from './RequestDetailDialog'

interface DocumentListPageProps {
  title: string
  emptyName: string
  documents: HrmsRequest[]
  loading: boolean
  error: unknown
  fields: string[]
  createPath?: string
  filters?: Array<{ field: string; label: string; options: string[] }>
  scope?: 'mine' | 'team'
  onScopeChange?: (scope: 'mine' | 'team') => void
}

export function DocumentListPage({
  title,
  emptyName,
  documents,
  loading,
  error,
  fields,
  createPath,
  filters = [],
  scope,
  onScopeChange,
}: DocumentListPageProps) {
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<HrmsRequest | null>(null)
  const filtered = useMemo(
    () => filterHrmsDocuments(documents, fields, search, activeFilters),
    [activeFilters, documents, fields, search],
  )

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink-gray-9">{__(title)}</h1>
        <div className="flex items-center gap-2">
          {scope && onScopeChange && (
            <Select
              value={scope}
              options={[
                { label: __('My Records'), value: 'mine' },
                { label: __('Team Records'), value: 'team' },
              ]}
              onChange={(value) => onScopeChange(value === 'team' ? 'team' : 'mine')}
            />
          )}
          {createPath && (
            <Button to={createPath} variant="solid" iconLeft="lucide-plus">
              {__('Create')}
            </Button>
          )}
        </div>
      </div>
      <TextInput value={search} onChange={setSearch} placeholder={__('Search')} aria-label={__('Search')} />
      {filters.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filters.map((filter) => (
            <Select
              key={filter.field}
              label={__(filter.label)}
              value={activeFilters[filter.field] ?? ''}
              options={[
                { label: __('All'), value: '' },
                ...filter.options.map((option) => ({ label: __(option), value: option })),
              ]}
              onChange={(value) =>
                setActiveFilters((current) => ({ ...current, [filter.field]: value ? String(value) : '' }))
              }
            />
          ))}
        </div>
      )}
      {loading && !documents.length ? (
        <div className="flex justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <p className="rounded-lg bg-surface-red-2 p-4 text-sm text-ink-red-8" role="alert">
          {__('Unable to load {0}', [emptyName])}
        </p>
      ) : !filtered.length ? (
        <EmptyState name={emptyName} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base">
          {filtered.map((document) => (
            <ItemListRow
              key={document.name}
              size="lg"
              className="cursor-pointer border-b border-outline-gray-1 last:border-b-0"
              onClick={() => setSelected(document)}
            >
              <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(10rem,1.5fr)_repeat(3,minmax(7rem,1fr))]">
                {fields.slice(0, 4).map((field) => (
                  <div key={field} className="min-w-0">
                    <p className="text-xs text-ink-gray-5">{__(field.replaceAll('_', ' '))}</p>
                    <p className="truncate text-sm text-ink-gray-8">
                      {formatHrmsListField(document, field) || __('—')}
                    </p>
                  </div>
                ))}
                {document.status && <Badge label={__(document.status)} variant="outline" />}
              </div>
            </ItemListRow>
          ))}
        </div>
      )}
      <RequestDetailDialog request={selected} onClose={() => setSelected(null)} />
    </main>
  )
}
