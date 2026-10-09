import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentSessionUser } from '../stores/usersStore'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { Badge, Button, ErrorMessage, FormControl, Spinner } from '@/design-system'
import { FilesUploader } from './FilesUploader'
import { Icon } from './Icon'
import { useMeta } from '../hooks/useMeta'
import { timeAgo } from '../utils/date'
import type { DocRecord } from '../types/meta'

type AnyRecord = Record<string, any>

interface DeskRecordPanelProps {
  doctype: string
  docname: string
  doc: DocRecord
  readOnly?: boolean
  hideTags?: boolean
}

function listValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string')
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  return []
}

export function DeskRecordPanel({ doctype, docname, doc, readOnly = false, hideTags = false }: DeskRecordPanelProps) {
  const navigate = useNavigate()
  const meta = useMeta(doctype)
  const attachments = useResource<AnyRecord[]>({
    url: 'frappe.client.get_list',
    params: {
      doctype: 'File',
      fields: ['name', 'file_name', 'file_url', 'is_private'],
      filters: { attached_to_doctype: doctype, attached_to_name: docname },
      limit_page_length: 50,
    },
    cache: ['desk-attachments', doctype, docname],
    auto: true,
    initialData: [],
  })
  const assignments = useResource<AnyRecord[]>({
    url: 'frappe.client.get_list',
    params: {
      doctype: 'ToDo',
      fields: ['name', 'allocated_to', 'description', 'status'],
      filters: { reference_type: doctype, reference_name: docname, status: ['not in', ['Cancelled', 'Closed']] },
      limit_page_length: 20,
    },
    cache: ['desk-assignments', doctype, docname],
    auto: true,
    initialData: [],
  })
  const transitions = useResource<AnyRecord[]>({
    url: 'frappe.model.workflow.get_transitions',
    params: { doc },
    cache: ['desk-workflow', doctype, docname, JSON.stringify(doc)],
    auto: Boolean(doc.name) && Boolean((meta.doctypeMeta as AnyRecord | undefined)?.__workflow_docs?.length),
    initialData: [],
  })
  const [tag, setTag] = useState('')
  const [assignee, setAssignee] = useState('')
  const [shareUser, setShareUser] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tags = useMemo(() => listValue(doc._user_tags), [doc._user_tags])
  const liked = listValue(doc._liked_by).includes(currentSessionUser() ?? '')
  async function refresh() {
    await Promise.all([attachments.reload(), assignments.reload(), transitions.reload()])
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await refresh()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }

  function addTag() {
    const value = tag.trim()
    if (!value) return
    void run(async () => {
      await rpc({
        url: 'frappe.desk.doctype.tag.tag.add_tag',
        method: 'POST',
        params: { tag: value, dt: doctype, dn: docname },
      })
      setTag('')
    })
  }

  function removeTag(value: string) {
    void run(() =>
      rpc({
        url: 'frappe.desk.doctype.tag.tag.remove_tag',
        method: 'POST',
        params: { tag: value, dt: doctype, dn: docname },
      }),
    )
  }

  function toggleLike() {
    void run(() =>
      rpc({ url: 'frappe.desk.like.toggle_like', method: 'POST', params: { doctype, name: docname, add: !liked } }),
    )
  }

  function addShare() {
    const user = shareUser.trim()
    if (!user) return
    void run(async () => {
      await rpc({
        url: 'frappe.share.add',
        method: 'POST',
        params: { doctype, name: docname, user, read: 1, write: 0, submit: 0, share: 0 },
      })
      setShareUser('')
    })
  }

  function addAssignment() {
    const value = assignee.trim()
    if (!value) return
    void run(async () => {
      await rpc({
        url: 'frappe.desk.form.assign_to.add',
        method: 'POST',
        params: { args: { assign_to: [value], doctype, name: docname } },
      })
      setAssignee('')
    })
  }

  function removeAssignment(value: string) {
    void run(() =>
      rpc({
        url: 'frappe.desk.form.assign_to.remove',
        method: 'POST',
        params: { doctype, name: docname, assign_to: value },
      }),
    )
  }

  function applyWorkflow(action: string) {
    void run(() => rpc({ url: 'frappe.model.workflow.apply_workflow', method: 'POST', params: { doc, action } }))
  }

  const [adding, setAdding] = useState<'' | 'assign' | 'tag' | 'share'>('')
  const title = String(doc.full_name ?? doc[meta.doctypeMeta?.title_field ?? ''] ?? doc.title ?? docname)
  const docMetaImageField = (meta.doctypeMeta as Record<string, unknown> | null)?.image_field
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('')
  const subtitle = doctype === 'User' ? String(doc.email ?? '') : ''
  const row = 'flex h-11 items-center justify-between gap-2 text-base text-ink-gray-5'

  function submitInline() {
    if (adding === 'assign') addAssignment()
    if (adding === 'tag') addTag()
    if (adding === 'share') addShare()
    setAdding('')
  }

  const inline = (kind: 'assign' | 'tag' | 'share', value: string, set: (next: string) => void, placeholder: string) =>
    adding === kind ? (
      <div className="flex gap-2 pb-2">
        <FormControl type="text" value={value} placeholder={placeholder} onChange={(next) => set(String(next))} />
        <Button variant="solid" icon="lucide-check" disabled={busy || !value.trim()} onClick={submitInline} />
      </div>
    ) : null

  const hasImage = Boolean(docMetaImageField)
  const actions = (
    <div className="flex shrink-0 items-center gap-3 text-ink-gray-7">
      <button
        type="button"
        aria-label={__('Edit')}
        onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`)}
      >
        <Icon icon="lucide-square-pen" className="size-4" />
      </button>
      <button type="button" aria-label={__('Print')} onClick={() => window.print()}>
        <Icon icon="lucide-printer" className="size-4" />
      </button>
      <button type="button" aria-label={liked ? __('Unlike') : __('Like')} disabled={busy} onClick={toggleLike}>
        <Icon icon="lucide-heart" className={liked ? 'size-4 fill-current text-ink-red-4' : 'size-4'} />
      </button>
    </div>
  )

  return (
    <aside className="flex min-w-0 flex-1 flex-col border-l border-outline-gray-2 bg-surface-base">
      <div className="px-4 pt-4">
        {hasImage ? (
          <div className="flex items-start justify-between">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-surface-gray-2 text-4xl text-ink-gray-5">
              {initials || '·'}
            </div>
            {actions}
          </div>
        ) : null}
        <div className={hasImage ? 'mt-3 pb-4' : 'flex items-center justify-between gap-2 pb-4'}>
          <div className="min-w-0">
            <div className="truncate text-base-semibold text-ink-gray-9">{title}</div>
            {subtitle && <div className="mt-1 text-base text-ink-gray-7">{subtitle}</div>}
          </div>
          {hasImage ? null : actions}
        </div>
      </div>
      {error && <ErrorMessage className="mx-5 mt-3" message={error} />}
      {transitions.data && transitions.data.length > 0 && (
        <div className="mx-5 mt-3 flex flex-wrap gap-2">
          {transitions.data.map((transition) => (
            <Button
              key={transition.action}
              variant="outline"
              disabled={busy}
              onClick={() => applyWorkflow(String(transition.action))}
            >
              {String(transition.action)}
            </Button>
          ))}
        </div>
      )}
      <div className="border-y border-outline-gray-2 px-4 py-1">
        <div className={row}>
          <span className="flex items-center gap-2">
            <Icon icon="lucide-users" className="size-4" />
            {__('Assign')}
          </span>
          {!readOnly && (
            <button
              type="button"
              aria-label={__('Assign')}
              onClick={() => setAdding(adding === 'assign' ? '' : 'assign')}
            >
              <Icon icon="lucide-plus" className="size-4" />
            </button>
          )}
        </div>
        {inline('assign', assignee, setAssignee, __('User email'))}
        {(assignments.data ?? []).map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-2 pb-2 pl-6 text-sm text-ink-gray-7">
            <span>{String(item.allocated_to ?? '')}</span>
            {!readOnly && (
              <button type="button" onClick={() => removeAssignment(String(item.allocated_to))}>
                <Icon icon="lucide-x" className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        <div className={row}>
          <span className="flex items-center gap-2">
            <Icon icon="lucide-paperclip" className="size-4" />
            {__('Attachments')}
          </span>
          {!readOnly && (
            <button type="button" aria-label={__('Attach')} onClick={() => setUploadOpen(true)}>
              <Icon icon="lucide-plus" className="size-4" />
            </button>
          )}
        </div>
        {(attachments.data ?? []).map((item) => (
          <a
            key={item.name}
            href={String(item.file_url)}
            target="_blank"
            rel="noreferrer"
            className="block truncate pb-2 pl-6 text-sm text-ink-blue-6"
          >
            {String(item.file_name ?? item.file_url ?? '')}
          </a>
        ))}
        {!hideTags && (
          <>
            <div className={row}>
              <span className="flex items-center gap-2">
                <Icon icon="lucide-tag" className="size-4" />
                {__('Tags')}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  aria-label={__('Add tag')}
                  onClick={() => setAdding(adding === 'tag' ? '' : 'tag')}
                >
                  <Icon icon="lucide-plus" className="size-4" />
                </button>
              )}
            </div>
            {inline('tag', tag, setTag, __('Add tag'))}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pb-2 pl-6">
                {tags.map((value) => (
                  <Badge
                    key={value}
                    label={value}
                    suffix={!readOnly ? <button onClick={() => removeTag(value)}>×</button> : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}
        <div className={row}>
          <span className="flex items-center gap-2">
            <Icon icon="lucide-share-2" className="size-4" />
            {__('Share')}
          </span>
          {!readOnly && (
            <button type="button" aria-label={__('Share')} onClick={() => setAdding(adding === 'share' ? '' : 'share')}>
              <Icon icon="lucide-plus" className="size-4" />
            </button>
          )}
        </div>
        {inline('share', shareUser, setShareUser, __('User email'))}
      </div>
      <div className="flex flex-col gap-3 px-4 py-4 text-base leading-6 text-ink-gray-6">
        <div>
          <div>
            {__('Last Edited By')} <span className="text-ink-gray-9">{String(doc.modified_by ?? '')}</span>
          </div>
          <div className="mt-1 text-ink-gray-5">{timeAgo(doc.modified as string)}</div>
        </div>
        <div>
          <div>
            {__('Created By')} <span className="text-ink-gray-9">{String(doc.owner ?? '')}</span>
          </div>
          <div className="mt-1 text-ink-gray-5">{timeAgo(doc.creation as string)}</div>
        </div>
      </div>
      {busy && (
        <div className="px-5 pb-3">
          <Spinner size="sm" />
        </div>
      )}
      <FilesUploader
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        doctype={doctype}
        docname={docname}
        onAfter={() => void attachments.reload()}
      />
    </aside>
  )
}
