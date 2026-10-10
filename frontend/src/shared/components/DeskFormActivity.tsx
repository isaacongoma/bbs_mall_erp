import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { Button, ErrorMessage, Spinner } from '@/design-system'
import { DeskFormComments } from './DeskFormComments'
import { DeskFormConnections } from './DeskFormConnections'
import { timeAgo } from '../utils/date'
import { sanitizeHTML } from '../utils/text'
import type { DocRecord } from '../types/meta'

type AnyRecord = Record<string, any>

interface DeskFormActivityProps {
  hideConnections?: boolean
  doctype: string
  docname: string
  doc: DocRecord
}

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

function versionChanges(row: AnyRecord): Array<{ field: string; oldValue: string; newValue: string }> {
  let data: AnyRecord = {}
  if (typeof row.data === 'string') {
    try {
      const parsed = JSON.parse(row.data) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed as AnyRecord
    } catch {
      data = {}
    }
  } else if (row.data && typeof row.data === 'object' && !Array.isArray(row.data)) {
    data = row.data as AnyRecord
  }
  const changed = Array.isArray(data.changed) ? data.changed : Array.isArray(data.changes) ? data.changes : []
  return changed.flatMap((entry) => {
    if (!Array.isArray(entry) || entry.length < 3) return []
    return [{ field: String(entry[0]), oldValue: String(entry[1] ?? ''), newValue: String(entry[2] ?? '') }]
  })
}

function timelineRows(doc: DocRecord, info: AnyRecord): AnyRecord[] {
  const rows: AnyRecord[] = []
  if (doc.creation) rows.push({ name: 'creation', creation: doc.creation, title: __('Created'), content: doc.owner })
  if (doc.modified && doc.modified !== doc.creation) {
    rows.push({ name: 'modified', creation: doc.modified, title: __('Last modified'), content: doc.modified_by })
  }
  const groups: Array<[string, string]> = [
    ['comments', 'Comment'],
    ['communications', 'Communication'],
    ['versions', 'Version'],
    ['workflow_logs', 'Workflow'],
    ['assignment_logs', 'Assignment'],
    ['attachment_logs', 'Attachment'],
    ['share_logs', 'Share'],
    ['like_logs', 'Like'],
    ['views', 'View'],
    ['info_logs', 'Info'],
    ['milestones', 'Milestone'],
  ]
  for (const [key, title] of groups) {
    for (const row of asRows(info[key])) {
      rows.push({
        ...row,
        timelineType: key,
        title,
        content: row.content ?? row.subject ?? row.owner ?? row.sender ?? row.name,
        changes: key === 'versions' ? versionChanges(row) : [],
      })
    }
  }
  return rows.sort((left, right) => String(right.creation ?? '').localeCompare(String(left.creation ?? '')))
}

export function DeskFormActivity({ doctype, docname, doc, hideConnections = false }: DeskFormActivityProps) {
  const navigate = useNavigate()
  const docinfo = useResource<AnyRecord>({
    url: 'frappe.desk.form.load.get_docinfo',
    params: { doctype, name: docname },
    cache: ['desk-docinfo', doctype, docname],
    auto: true,
    initialData: {},
    transform: (raw) => unwrap(raw),
  })
  const timeline = useMemo(() => timelineRows(doc, docinfo.data ?? {}), [doc, docinfo.data])
  function describe(row: AnyRecord): string {
    if (row.name === 'creation') return `${String(row.content ?? '')} ${__('created this')}`
    if (row.name === 'modified') return `${String(row.content ?? '')} ${__('last edited this')}`
    return `${__(String(row.title ?? __('Activity')))}: ${String(row.content ?? '')}`
  }

  return (
    <div className="flex flex-col">
      {!hideConnections && <DeskFormConnections doctype={doctype} docname={docname} />}
      <DeskFormComments doctype={doctype} docname={docname} readOnly={doc.docstatus === 2} />
      <section className="px-6 pb-8 pt-2">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-xl-medium text-ink-gray-9">{__('Activity')}</h2>
          <div className="flex items-center gap-2">
            {docinfo.loading && <Spinner size="sm" />}
            <Button
              variant="subtle"
              className="!border !border-outline-gray-2 !bg-surface-base"
              iconLeft="lucide-plus"
              label={__('New Email')}
              onClick={() =>
                navigate(
                  `/app/communication/new?reference_doctype=${encodeURIComponent(doctype)}&reference_name=${encodeURIComponent(docname)}`,
                )
              }
            />
          </div>
        </div>
        {docinfo.error && <ErrorMessage message={String(docinfo.error.message ?? docinfo.error)} />}
        {!docinfo.loading && !timeline.length && <p className="text-base text-ink-gray-6">{__('No activity yet')}</p>}
        <ul className="ml-3 flex flex-col gap-4 border-l border-outline-gray-2 pl-5">
          {timeline.map((row, index) => (
            <li key={`${String(row.name ?? row.title)}:${index}`} className="relative text-base text-ink-gray-7">
              <span className="absolute -left-[25px] top-2 size-1.5 rounded-full bg-ink-gray-8" aria-hidden="true" />
              {row.timelineType === 'comments' ? (
                <span dangerouslySetInnerHTML={{ __html: sanitizeHTML(String(row.content ?? '')) }} />
              ) : (
                <span>{describe(row)}</span>
              )}
              {row.creation && <span className="text-ink-gray-6"> · {timeAgo(String(row.creation))}</span>}
              {Array.isArray(row.changes) && row.changes.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-md border border-outline-gray-2 text-sm">
                  {row.changes.map((change: { field: string; oldValue: string; newValue: string }) => (
                    <div
                      key={change.field}
                      className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] border-b border-outline-gray-1 last:border-b-0"
                    >
                      <span className="bg-surface-gray-1 px-2 py-1 text-ink-gray-6">{change.field}</span>
                      <span className="px-2 py-1">
                        <span className="text-ink-red-6">{change.oldValue || __('Empty')}</span> →{' '}
                        <span className="text-ink-green-7">{change.newValue || __('Empty')}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
