import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { Badge, Button, ErrorMessage } from '@/design-system'
import { useMeta } from '../hooks/useMeta'
import { dashboardTransactions } from '../utils/dashboardTransactions'

type AnyRecord = Record<string, any>

function unwrap(value: unknown): AnyRecord {
  if (value && typeof value === 'object' && 'message' in (value as object)) {
    const message = (value as AnyRecord).message
    if (message && typeof message === 'object') return message as AnyRecord
  }
  return value && typeof value === 'object' ? (value as AnyRecord) : {}
}

function asRows(value: unknown): AnyRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is AnyRecord => Boolean(item && typeof item === 'object'))
    : []
}

export interface DeskFormConnectionsProps {
  doctype: string
  docname: string
  bare?: boolean
}

export function DeskFormConnections({ doctype, docname, bare = false }: DeskFormConnectionsProps) {
  const navigate = useNavigate()
  const meta = useMeta(doctype)
  const linked = useResource<AnyRecord>({
    url: 'frappe.desk.form.linked_with.get',
    params: { doctype, docname },
    cache: ['desk-linked-docs', doctype, docname],
    auto: true,
    initialData: {},
    transform: (raw) => unwrap(raw),
  })
  const connections = useMemo(() => {
    const rows: Array<{ doctype: string; docs: AnyRecord[]; hiddenCount: number }> = []
    for (const [linkedDoctype, value] of Object.entries(linked.data ?? {})) {
      const entry = value && typeof value === 'object' ? (value as AnyRecord) : {}
      const docs = asRows(entry.docs)
      const hiddenCount = Number(entry.hidden_count ?? 0)
      if (docs.length || hiddenCount) rows.push({ doctype: linkedDoctype, docs, hiddenCount })
    }
    return rows
  }, [linked.data])
  const transactions = useMemo(() => dashboardTransactions(meta.doctypeMeta), [meta.doctypeMeta])

  function createRelated(transaction: { doctype: string; fieldname: string }) {
    const query = new URLSearchParams({ [transaction.fieldname]: docname })
    navigate(`/app/${encodeURIComponent(transaction.doctype)}/new?${query.toString()}`)
  }

  if (!connections.length && !transactions.length) return null

  return (
    <section className={bare ? 'py-2' : 'border-t border-outline-gray-2 px-6 py-5'}>
      <h2 className="mb-3 text-xl-medium text-ink-gray-9">{__('Connections')}</h2>
      {linked.error && <ErrorMessage message={String(linked.error.message ?? linked.error)} />}
      <div className="flex flex-wrap gap-2">
        {connections.map((connection) => (
          <div
            key={connection.doctype}
            className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-gray-1 px-3 py-2 text-base"
          >
            <span className="text-ink-gray-7">{__(connection.doctype)}</span>
            {connection.docs.map((row) => (
              <button
                key={`${connection.doctype}:${String(row.name)}`}
                type="button"
                className="text-ink-blue-6 hover:underline"
                onClick={() =>
                  navigate(`/app/${encodeURIComponent(connection.doctype)}/${encodeURIComponent(String(row.name))}`)
                }
              >
                {String(row.name)}
              </button>
            ))}
            {connection.hiddenCount > 0 && <Badge label={__('+{0} restricted', [connection.hiddenCount])} />}
          </div>
        ))}
        {transactions.map((transaction) => (
          <Button
            key={transaction.doctype}
            variant="subtle"
            iconLeft="lucide-plus"
            label={__(transaction.doctype)}
            onClick={() => createRelated(transaction)}
          />
        ))}
      </div>
    </section>
  )
}
