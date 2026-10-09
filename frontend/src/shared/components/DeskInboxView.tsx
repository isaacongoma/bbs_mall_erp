import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Badge, Button } from '@/design-system'
import { EmptyState } from './ListViews'
import type { DocRecord } from '../types/meta'

interface InboxColumn {
  key: string
  label: string
}

interface DeskInboxViewProps {
  doctype: string
  rows: DocRecord[]
  columns: InboxColumn[]
}

function displayValue(row: DocRecord, key: string): string {
  const value = row[key]
  return value == null ? '' : String(value)
}

function statusTone(value: string): 'blue' | 'green' | 'red' | 'orange' | 'gray' {
  const normalized = value.toLowerCase()
  if (['completed', 'approved', 'active', 'open', 'submitted', 'paid'].some((entry) => normalized.includes(entry)))
    return 'green'
  if (['cancelled', 'rejected', 'closed', 'inactive', 'overdue'].some((entry) => normalized.includes(entry)))
    return 'red'
  if (['pending', 'draft', 'in progress', 'partly'].some((entry) => normalized.includes(entry))) return 'orange'
  return 'blue'
}

export function DeskInboxView({ doctype, rows, columns }: DeskInboxViewProps) {
  const navigate = useNavigate()
  const [selectedName, setSelectedName] = useState(String(rows[0]?.name ?? ''))
  const selected = useMemo(
    () => rows.find((row) => String(row.name) === selectedName) ?? rows[0] ?? null,
    [rows, selectedName],
  )
  const titleColumn = columns.find((column) => /subject|title|name/i.test(column.key)) ?? columns[0]
  const statusColumn = columns.find((column) => /status|state/i.test(column.key))
  const previewColumns = columns.filter((column) => column.key !== titleColumn?.key && column.key !== 'name')

  if (!rows.length) return <EmptyState name={doctype} />

  async function markRead() {
    if (!selected?.name) return
    const readField = columns.find((column) => /read|seen/i.test(column.key))?.key
    if (!readField) return
    await rpc({
      url: 'frappe.client.set_value',
      method: 'POST',
      params: { doctype, name: selected.name, fieldname: readField, value: 1 },
    })
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)]">
      <section
        className="min-h-0 overflow-y-auto border-b border-outline-gray-2 lg:border-b-0 lg:border-r"
        aria-label={__('Inbox records')}
      >
        {rows.map((row) => {
          const name = String(row.name)
          const title = displayValue(row, titleColumn?.key ?? 'name') || name
          const status = statusColumn ? displayValue(row, statusColumn.key) : ''
          const isSelected = name === String(selected?.name ?? '')
          return (
            <button
              key={name}
              type="button"
              className={`flex w-full flex-col gap-1 border-b border-outline-gray-1 px-4 py-3 text-left transition-colors ${isSelected ? 'bg-surface-blue-1' : 'hover:bg-surface-gray-1'}`}
              aria-current={isSelected ? 'true' : undefined}
              onClick={() => setSelectedName(name)}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="truncate text-sm-medium text-ink-gray-9">{title}</span>
                {status && <Badge label={status} theme={statusTone(status)} />}
              </div>
              <span className="truncate text-xs text-ink-gray-6">{name}</span>
            </button>
          )
        })}
      </section>
      <section className="min-h-0 overflow-y-auto p-4 sm:p-6" aria-label={__('Inbox preview')}>
        {selected ? (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-gray-2 pb-4">
              <div>
                <h2 className="text-xl-semibold text-ink-gray-9">
                  {displayValue(selected, titleColumn?.key ?? 'name') || String(selected.name)}
                </h2>
                <p className="mt-1 text-sm text-ink-gray-6">{String(selected.name)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" label={__('Mark read')} onClick={() => void markRead()} />
                <Button
                  variant="solid"
                  label={__('Open')}
                  onClick={() =>
                    navigate(`/app/${encodeURIComponent(doctype)}/${encodeURIComponent(String(selected.name))}`)
                  }
                />
              </div>
            </div>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {previewColumns.map((column) => {
                const value = displayValue(selected, column.key)
                if (!value) return null
                return (
                  <div key={column.key}>
                    <dt className="text-xs text-ink-gray-6">{__(column.label)}</dt>
                    <dd className="mt-1 break-words text-sm text-ink-gray-9">{value}</dd>
                  </div>
                )
              })}
            </dl>
          </div>
        ) : (
          <EmptyState name={__('Select a record')} />
        )}
      </section>
    </div>
  )
}
