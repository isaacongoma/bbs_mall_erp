import { useEffect } from 'react'
import { LucideIcon } from '@/design-system'
import { sanitizeHTML } from '@/shared/utils/text'
import { portalApi } from '../api/portal'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, Loading, PageHeading, StatusBadge } from '../components/PortalUi'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { formatDateTime } from '../utils/format'
import { markNoticesSeen } from '../utils/notices'

const TONE: Record<string, string> = {
  Urgent: 'border-[#dc2626]/40 bg-[#dc2626]/5',
  Important: 'border-[#b8860b]/40 bg-[#b8860b]/5',
  Info: 'border-outline-gray-2 bg-surface-base',
}

export default function Notices() {
  const { data, loading, error, reload } = usePortalQuery((customer) => portalApi.notices(customer))

  useEffect(() => {
    if (data) markNoticesSeen()
  }, [data])

  return (
    <PortalLayout title="Notices">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <PageHeading title="Notices" subtitle="Announcements from the management office" />
        {loading && !data && <Loading />}
        {error && <ErrorPanel message={error} onRetry={reload} />}
        {data?.length === 0 && (
          <Card>
            <EmptyState
              icon="megaphone"
              title="No notices"
              message="Planned maintenance, events and mall updates will appear here."
            />
          </Card>
        )}
        {data?.map((notice) => (
          <article
            key={notice.name}
            className={`rounded-2xl border p-5 shadow-sm ${TONE[notice.priority] ?? TONE.Info}`}
          >
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-ink-gray-9">{notice.title}</h2>
              <StatusBadge status={notice.priority} />
            </header>
            <p className="mt-0.5 text-xs text-ink-gray-5">{formatDateTime(notice.published_on)}</p>
            <div
              className="prose prose-sm mt-3 max-w-none text-ink-gray-7"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(notice.message) }}
            />
            {notice.attachment && (
              <a
                href={notice.attachment}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-surface-gray-2 px-3 py-2 text-sm font-medium text-ink-gray-8 hover:bg-surface-gray-3"
              >
                <LucideIcon name="paperclip" className="size-4" />
                Attachment
              </a>
            )}
          </article>
        ))}
      </div>
    </PortalLayout>
  )
}
