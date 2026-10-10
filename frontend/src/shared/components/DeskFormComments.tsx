import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { Button, ErrorMessage } from '@/design-system'
import { currentSessionUser } from '../stores/usersStore'
import { isContentEmpty, sanitizeHTML } from '../utils/text'
import { timeAgo } from '../utils/date'

type AnyRecord = Record<string, any>

interface DeskFormCommentsProps {
  doctype: string
  docname: string
  readOnly?: boolean
}

function initials(value: string): string {
  const parts = value.split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase()
}

export function DeskFormComments({ doctype, docname, readOnly = false }: DeskFormCommentsProps) {
  const comments = useResource<AnyRecord[]>({
    url: 'frappe.client.get_list',
    params: {
      doctype: 'Comment',
      fields: ['name', 'creation', 'content', 'owner', 'comment_type'],
      filters: { reference_doctype: doctype, reference_name: docname, comment_type: 'Comment' },
      order_by: 'creation desc',
      limit_page_length: 50,
    },
    cache: ['desk-comments', doctype, docname],
    auto: true,
    initialData: [],
  })
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = currentSessionUser() ?? ''

  async function submit() {
    if (isContentEmpty(draft)) return
    setBusy(true)
    setError(null)
    try {
      await rpc({
        url: 'frappe.desk.form.utils.add_comment',
        method: 'POST',
        params: {
          reference_doctype: doctype,
          reference_name: docname,
          content: draft.trim(),
          comment_email: user,
          comment_by: user,
        },
      })
      setDraft('')
      await comments.reload()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="px-6 py-5">
      <h2 className="mb-3 text-xl-medium text-ink-gray-9">{__('Comments')}</h2>
      {error && <ErrorMessage className="mb-2" message={error} />}
      {!readOnly && (
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-outline-gray-2 bg-surface-base text-sm text-ink-gray-7">
            {initials(user)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <textarea
              value={draft}
              rows={draft ? 3 : 1}
              placeholder={__('Type a reply / comment')}
              className="w-full resize-none rounded-sm border border-outline-gray-2 bg-surface-base px-3 py-2.5 text-base text-ink-gray-8 placeholder:text-ink-gray-5 focus:ring-0"
              onChange={(event) => setDraft(event.target.value)}
            />
            {draft && (
              <Button
                variant="solid"
                className="self-end"
                label={__('Comment')}
                loading={busy}
                onClick={() => void submit()}
              />
            )}
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-col gap-3">
        {(comments.data ?? []).map((item) => (
          <div key={String(item.name)} className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-outline-gray-2 bg-surface-base text-sm text-ink-gray-7">
              {initials(String(item.owner ?? ''))}
            </span>
            <div className="min-w-0 flex-1 rounded-sm border border-outline-gray-2 bg-surface-base px-3 py-2">
              <div className="text-sm text-ink-gray-6">
                {String(item.owner ?? '')} · {timeAgo(String(item.creation ?? ''))}
              </div>
              <div
                className="prose-sm max-w-none text-ink-gray-8"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(String(item.content ?? '')) }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
