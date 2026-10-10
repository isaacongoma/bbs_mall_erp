import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoute } from '@/core/navigation'
import { Button, ErrorMessage, Rating, Textarea, toast } from '@/design-system'
import { portalApi } from '../api/portal'
import { sanitizeHTML } from '@/shared/utils/text'
import { PortalLayout } from '../components/PortalLayout'
import { Card, ErrorPanel, KeyValue, Loading, StatusBadge } from '../components/PortalUi'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { usePortalStore } from '../stores/portalStore'
import { formatDateTime, relativeDays } from '../utils/format'

const STAGES = ['Open', 'Assigned', 'In Progress', 'Resolved']

export default function MaintenanceDetail() {
  const route = useRoute()
  const navigate = useNavigate()
  const name = decodeURIComponent(route.params.name ?? '')
  const customer = usePortalStore((state) => state.customer)
  const { data, loading, error, reload } = usePortalQuery((id) => portalApi.maintenanceRequest(name, id), [name])
  const [note, setNote] = useState('')
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  async function post() {
    if (!note.trim()) return
    setBusy(true)
    setProblem('')
    try {
      await portalApi.commentMaintenance(name, note.trim(), customer)
      setNote('')
      reload()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  async function rate() {
    if (!rating) return setProblem('Choose a star rating first.')
    setBusy(true)
    try {
      await portalApi.rateMaintenance(name, rating, feedback, customer)
      toast.success('Thank you for your feedback')
      reload()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const stage = data
    ? Math.max(
        0,
        STAGES.indexOf(data.status === 'Closed' ? 'Resolved' : data.status === 'On Hold' ? 'In Progress' : data.status),
      )
    : 0

  return (
    <PortalLayout title={name}>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <button
          type="button"
          onClick={() => navigate('/tenant/maintenance')}
          className="self-start text-sm font-medium text-ink-gray-6 hover:text-ink-gray-9"
        >
          &larr; All requests
        </button>
        {loading && !data && <Loading />}
        {error && <ErrorPanel message={error} onRetry={reload} />}
        {data && (
          <>
            <section className="rounded-3xl border border-outline-gray-2 bg-surface-base p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-gray-5">{data.name}</p>
                  <h1 className="mt-1 text-xl font-semibold text-ink-gray-9">{data.subject}</h1>
                  <p className="mt-1 text-sm text-ink-gray-5">
                    {data.category} - {data.unit} - opened {formatDateTime(data.opened_on)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={data.status} />
                  <StatusBadge status={data.priority} />
                </div>
              </div>
              <ol className="mt-6 grid grid-cols-4 gap-2">
                {STAGES.map((label, index) => (
                  <li key={label} className="flex flex-col gap-1.5">
                    <span className={`h-1.5 rounded-full ${index <= stage ? 'bg-[#b8860b]' : 'bg-surface-gray-3'}`} />
                    <span className={`text-xs ${index <= stage ? 'font-semibold text-ink-gray-9' : 'text-ink-gray-5'}`}>
                      {label}
                    </span>
                  </li>
                ))}
              </ol>
              {data.status !== 'Resolved' && data.status !== 'Closed' && data.due_by && (
                <p className="mt-4 text-sm text-ink-gray-6">
                  We aim to respond {relativeDays(data.due_by)} ({formatDateTime(data.due_by)}).
                </p>
              )}
            </section>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="flex flex-col gap-6 lg:col-span-2">
                {data.description && (
                  <Card title="Details">
                    <div
                      className="prose prose-sm max-w-none text-ink-gray-7"
                      dangerouslySetInnerHTML={{ __html: sanitizeHTML(data.description) }}
                    />
                  </Card>
                )}
                {data.attachments.length > 0 && (
                  <Card title="Photos">
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {data.attachments.map((file) => (
                        <a
                          key={file.name}
                          href={file.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block aspect-square overflow-hidden rounded-xl border border-outline-gray-2"
                        >
                          {/\.(png|jpe?g|webp|gif)$/i.test(file.file_name) ? (
                            <img src={file.file_url} alt={file.file_name} className="size-full object-cover" />
                          ) : (
                            <span className="flex size-full items-center justify-center p-2 text-center text-xs text-ink-gray-6">
                              {file.file_name}
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  </Card>
                )}
                <Card title="Activity">
                  <ol className="relative ml-2 flex flex-col gap-5 border-l-2 border-outline-gray-2 pl-5">
                    {data.updates.length === 0 && <li className="text-sm text-ink-gray-5">No updates yet.</li>}
                    {[...data.updates].reverse().map((update, index) => (
                      <li key={index} className="relative">
                        <span className="absolute -left-[27px] top-1 size-3 rounded-full border-2 border-[#b8860b] bg-surface-base" />
                        <p className="text-sm text-ink-gray-9">{update.note}</p>
                        <p className="text-xs text-ink-gray-5">
                          {update.posted_by} - {formatDateTime(update.posted_on)}
                        </p>
                      </li>
                    ))}
                  </ol>
                  {data.status !== 'Cancelled' && (
                    <div className="mt-5 flex flex-col gap-3 border-t border-outline-gray-1 pt-4">
                      <Textarea
                        value={note}
                        onChange={setNote}
                        rows={3}
                        placeholder="Add a comment or more information..."
                      />
                      <ErrorMessage message={problem} />
                      <div className="flex justify-end">
                        <Button
                          label={
                            data.status === 'Resolved' || data.status === 'Closed'
                              ? 'Reopen with comment'
                              : 'Post comment'
                          }
                          variant="solid"
                          loading={busy}
                          disabled={!note.trim()}
                          onClick={() => void post()}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              </div>
              <div className="flex flex-col gap-6">
                <Card title="Summary">
                  <dl>
                    <KeyValue label="Status">{data.status}</KeyValue>
                    <KeyValue label="Priority">{data.priority}</KeyValue>
                    <KeyValue label="Space">{data.unit}</KeyValue>
                    <KeyValue label="Property">{data.property}</KeyValue>
                    {data.resolved_on && <KeyValue label="Resolved">{formatDateTime(data.resolved_on)}</KeyValue>}
                  </dl>
                  {data.resolution && (
                    <p className="mt-3 rounded-xl bg-[#16a34a]/10 p-3 text-sm text-[#15803d]">{data.resolution}</p>
                  )}
                </Card>
                {data.can_rate && (
                  <Card title="How did we do?">
                    <div className="flex flex-col gap-3">
                      <Rating value={rating} onChange={setRating} max={5} />
                      <Textarea
                        value={feedback}
                        onChange={setFeedback}
                        rows={3}
                        placeholder="Tell us about your experience (optional)"
                      />
                      <Button label="Send feedback" variant="solid" loading={busy} onClick={() => void rate()} />
                    </div>
                  </Card>
                )}
                {data.rating ? (
                  <Card title="Your rating">
                    <Rating value={Math.round(Number(data.rating) * 5)} max={5} disabled />
                    {data.feedback && <p className="mt-2 text-sm text-ink-gray-6">{data.feedback}</p>}
                  </Card>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  )
}
