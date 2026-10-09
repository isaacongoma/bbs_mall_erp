import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { __ } from '@/core/i18n'
import { useRoute } from '@/core/navigation'
import { useListResource, useResource } from '@/core/resources'
import { Button, Dropdown, ErrorMessage, Spinner, usePageMeta } from '@/design-system'
import { LayoutHeader } from '../components/LayoutHeader'
import { unwrapDeskResponse, type DeskWorkspace } from '../utils/deskWorkspace'
import { WorkspaceChart, WorkspaceNumberCard } from './DeskWorkspacePage'

interface DeskDashboardPageProps {
  dashboardName: string
}

type AnyRecord = Record<string, any>

export default function DeskDashboardPage({ dashboardName: nameProp }: Partial<DeskDashboardPageProps>) {
  const route = useRoute()
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const dashboards = useListResource({
    doctype: 'Dashboard',
    fields: ['name'],
    orderBy: 'name asc',
    pageLength: 100,
    auto: true,
  })
  const dashboardName = nameProp ?? decodeURIComponent(route.params.name ?? '')
  const dashboard = useResource<AnyRecord | null>({
    url: 'frappe.client.get',
    params: { doctype: 'Dashboard', name: dashboardName },
    cache: ['desk-dashboard', dashboardName],
    auto: Boolean(dashboardName),
    initialData: null,
    transform: (value) => {
      const payload = unwrapDeskResponse(value)
      return payload && typeof payload === 'object' ? (payload as AnyRecord) : null
    },
  })
  const cards = useMemo(() => {
    const value = dashboard.data?.cards
    return Array.isArray(value)
      ? value
          .map((entry: DeskWorkspace) => ({ number_card_name: entry.card, label: entry.label ?? entry.card }))
          .filter((entry: DeskWorkspace) => entry.number_card_name)
      : []
  }, [dashboard.data?.cards])
  const charts = useMemo(() => {
    const value = dashboard.data?.charts
    return Array.isArray(value)
      ? value
          .map((entry: DeskWorkspace) => ({
            chart_name: entry.chart,
            label: entry.label ?? entry.chart,
            width: entry.width,
          }))
          .filter((entry: DeskWorkspace) => entry.chart_name)
      : []
  }, [dashboard.data?.charts])

  usePageMeta({ title: dashboardName })
  if (dashboard.loading && !dashboard.data)
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  if (dashboard.error)
    return <ErrorMessage className="m-6" message={String(dashboard.error.message ?? dashboard.error)} />

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <LayoutHeader
        className="h-12"
        left={
          <h1 className="text-lg font-medium text-ink-gray-9">
            <span className="text-ink-gray-5">{__('Dashboard')} / </span>
            {__(dashboardName)}
          </h1>
        }
        right={
          <Dropdown
            placement="right"
            options={[
              { label: __('Edit'), onClick: () => navigate(`/app/dashboard/${encodeURIComponent(dashboardName)}`) },
              { label: __('New'), onClick: () => navigate('/app/dashboard/new') },
              { label: __('Refresh All'), onClick: () => setTick((value) => value + 1) },
              ...((dashboards.data ?? []) as AnyRecord[]).map((entry) => ({
                label: __(String(entry.name)),
                onClick: () => navigate(`/app/dashboard-view/${encodeURIComponent(String(entry.name))}`),
              })),
            ]}
          >
            {() => <Button variant="subtle" icon="lucide-ellipsis" aria-label={__('Menu')} />}
          </Dropdown>
        }
      />
      <div className="mx-auto w-full flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none]">
        {cards.length > 0 && (
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <WorkspaceNumberCard key={`${String(card.number_card_name)}:${tick}`} item={card} />
            ))}
          </div>
        )}
        {charts.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {charts.map((chart) => (
              <div
                key={`${String(chart.chart_name)}:${tick}`}
                className={chart.width === 'Full' ? 'lg:col-span-2' : undefined}
              >
                <WorkspaceChart item={chart} />
              </div>
            ))}
          </div>
        )}
        {!cards.length && !charts.length && (
          <p className="text-sm text-ink-gray-6">{__('This dashboard has no visible cards or charts.')}</p>
        )}
      </div>
    </main>
  )
}
