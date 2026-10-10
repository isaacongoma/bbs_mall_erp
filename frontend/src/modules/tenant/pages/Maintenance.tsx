import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/design-system'
import { portalApi } from '../api/portal'
import { PortalLayout } from '../components/PortalLayout'
import {
  Card,
  EmptyState,
  ErrorPanel,
  IconTile,
  Loading,
  PageHeading,
  Segmented,
  StatusBadge,
} from '../components/PortalUi'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { formatDate, relativeDays } from '../utils/format'

type Filter = 'all' | 'open' | 'closed'

export default function Maintenance() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const { data, loading, error, reload } = usePortalQuery(
    (customer) => portalApi.maintenance(customer, filter),
    [filter],
  )

  return (
    <PortalLayout title="Maintenance">
      <div className="flex flex-col gap-6">
        <PageHeading
          title="Maintenance"
          subtitle="Report problems and follow their progress"
          actions={
            <>
              <Segmented
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'open', label: 'Open' },
                  { value: 'closed', label: 'Closed' },
                ]}
              />
              <Button
                label="New request"
                variant="solid"
                iconLeft="lucide-plus"
                onClick={() => navigate('/tenant/maintenance/new')}
              />
            </>
          }
        />
        {loading && !data && <Loading />}
        {error && <ErrorPanel message={error} onRetry={reload} />}
        {data && (
          <Card bodyClassName="p-0 sm:p-0">
            {data.length === 0 ? (
              <EmptyState
                icon="wrench"
                title="No requests"
                message="Something broken or not working? Let the maintenance team know."
                action={
                  <Button label="Report an issue" variant="solid" onClick={() => navigate('/tenant/maintenance/new')} />
                }
              />
            ) : (
              <ul className="divide-y divide-outline-gray-1">
                {data.map((request) => (
                  <li key={request.name}>
                    <Link
                      to={`/tenant/maintenance/${encodeURIComponent(request.name)}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-surface-gray-1"
                    >
                      <IconTile
                        icon="wrench"
                        tone={request.priority === 'Urgent' ? 'red' : request.priority === 'High' ? 'gold' : 'blue'}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-gray-9">{request.subject}</p>
                        <p className="truncate text-xs text-ink-gray-5">
                          {request.name} - {request.category || 'General'} - {request.unit}
                        </p>
                      </div>
                      <div className="hidden text-right text-xs text-ink-gray-5 sm:block">
                        <p>Opened {formatDate(request.opened_on)}</p>
                        {request.status !== 'Resolved' && request.status !== 'Closed' && request.due_by && (
                          <p>Response {relativeDays(request.due_by)}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={request.status} />
                        <StatusBadge status={request.priority} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </PortalLayout>
  )
}
